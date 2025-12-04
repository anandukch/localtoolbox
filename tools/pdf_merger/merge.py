#!/usr/bin/env python3
"""
PDF Merger Tool

This script merges multiple PDF files into a single PDF document.
It takes a list of input PDF files and combines them in the specified order.

Usage:
    python merge.py

Input (JSON via stdin):
    {
        "input_files": ["/path/to/file1.pdf", "/path/to/file2.pdf", ...],
        "output": "/path/to/merged.pdf"
    }

Output (JSON to stdout):
    {
        "success": true,
        "message": "PDFs merged successfully",
        "output_path": "/path/to/merged.pdf",
        "total_pages": 25,
        "input_count": 3
    }
"""

import sys
import json
import os
from pathlib import Path

def main():
    try:
        # Read JSON input from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            raise ValueError("No input data received")
        
        data = json.loads(input_data)
        
        # Validate required fields
        required_fields = ['input_files', 'output']
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValueError(f"Missing required field: {field}")
        
        input_files = data['input_files']
        output_path = data['output']
        
        # Validate input files
        if not isinstance(input_files, list) or len(input_files) < 2:
            raise ValueError("At least 2 PDF files are required for merging")
        
        # Check if all input files exist
        for file_path in input_files:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Input file not found: {file_path}")
            
            # Check if file is a PDF (basic check)
            if not file_path.lower().endswith('.pdf'):
                raise ValueError(f"File is not a PDF: {file_path}")
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        # Import PyPDF2 (check if installed)
        try:
            from PyPDF2 import PdfReader, PdfWriter
        except ImportError:
            raise ImportError(
                "PyPDF2 is required but not installed. "
                "Please install it with: pip install PyPDF2"
            )
        
        # Create PDF writer object
        pdf_writer = PdfWriter()
        total_pages = 0
        
        # Process each input PDF
        for file_path in input_files:
            try:
                # Read the PDF file
                pdf_reader = PdfReader(file_path)
                
                # Add all pages from this PDF to the writer
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    pdf_writer.add_page(page)
                    total_pages += 1
                
                print(f"Added {len(pdf_reader.pages)} pages from {os.path.basename(file_path)}", file=sys.stderr)
                
            except Exception as e:
                raise ValueError(f"Error reading PDF file {file_path}: {str(e)}")
        
        # Write the merged PDF to output file
        try:
            with open(output_path, 'wb') as output_file:
                pdf_writer.write(output_file)
        except Exception as e:
            raise ValueError(f"Error writing merged PDF: {str(e)}")
        
        # Verify output file was created
        if not os.path.exists(output_path):
            raise ValueError("Failed to create output file")
        
        # Get output file size
        output_size = os.path.getsize(output_path)
        
        # Return success result
        result = {
            "success": True,
            "message": f"Successfully merged {len(input_files)} PDF files",
            "output_path": output_path,
            "total_pages": total_pages,
            "input_count": len(input_files),
            "output_size": output_size
        }
        
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        error_result = {
            "success": False,
            "message": f"Invalid JSON input: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            "success": False,
            "message": f"Error merging PDFs: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
