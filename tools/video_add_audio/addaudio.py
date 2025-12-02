#!/usr/bin/env python3
"""
Add Audio to Video Tool

This tool takes a video file and an audio file, and combines them into a new video file.
If the audio is longer than the video, it will be trimmed to match the video duration.

Input JSON format:
{
  "video": "/path/to/video.mp4",
  "audio": "/path/to/audio.mp3", 
  "output": "/path/to/output.mp4"
}

Output JSON format:
{
  "success": true,
  "message": "Task completed successfully",
  "output_path": "/path/to/output.mp4"
}
"""

import json
import sys
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
        required_fields = ['video', 'audio', 'output']
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValueError(f"Missing required field: {field}")
        
        video_path = data['video']
        audio_path = data['audio']
        output_path = data['output']
        
        # Debug: Log the original paths received
        print(f"DEBUG: Received paths - Video: {video_path}, Audio: {audio_path}, Output: {output_path}", file=sys.stderr)
        print(f"DEBUG: Current working directory: {os.getcwd()}", file=sys.stderr)
        
        # Convert to absolute paths and validate input files exist
        video_path = os.path.abspath(video_path)
        audio_path = os.path.abspath(audio_path)
        output_path = os.path.abspath(output_path)
        
        print(f"DEBUG: Absolute paths - Video: {video_path}, Audio: {audio_path}, Output: {output_path}", file=sys.stderr)
        
        if not os.path.exists(video_path):
            # Provide more debugging information
            cwd = os.getcwd()
            raise FileNotFoundError(f"Video file not found: {video_path} (Current working directory: {cwd})")
        
        if not os.path.exists(audio_path):
            cwd = os.getcwd()
            raise FileNotFoundError(f"Audio file not found: {audio_path} (Current working directory: {cwd})")
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        
        # Set up temporary directory for MoviePy (avoid read-only filesystem issues)
        import tempfile
        temp_dir = os.path.expanduser("~")  # Use home directory for temp files
        os.environ['TMPDIR'] = temp_dir
        os.environ['TEMP'] = temp_dir
        os.environ['TMP'] = temp_dir
        tempfile.tempdir = temp_dir
        
        # Try to import moviepy
        try:
            from moviepy import VideoFileClip, AudioFileClip
        except ImportError:
            raise ImportError(
                "MoviePy is required but not installed.\n\n"
                "To install MoviePy, run one of these commands:\n"
                "• For current user: pip3 install moviepy --user\n"
                "• System-wide: sudo pip3 install moviepy\n"
                "• Using apt: sudo apt install python3-moviepy\n\n"
                "Note: You may also need to install ffmpeg: sudo apt install ffmpeg"
            )
        
        # Load video and audio clips
        video = VideoFileClip(video_path)
        audio = AudioFileClip(audio_path)
        
        # Trim audio if it's longer than the video
        if audio.duration > video.duration:
            audio = audio.subclipped(0, video.duration)
        
        # Set audio to video
        final_video = video.with_audio(audio)
        
        # Configure MoviePy to use home directory for temporary files
        from moviepy.config import TEMP_FOLDER
        import moviepy.config as config
        config.TEMP_FOLDER = temp_dir
        
        # Suppress MoviePy's stdout to avoid JSON parsing issues
        import contextlib
        
        with open(os.devnull, 'w') as devnull:
            with contextlib.redirect_stdout(devnull):
                final_video.write_videofile(
                    output_path, 
                    codec='libx264', 
                    audio_codec='aac',
                    temp_audiofile=os.path.join(temp_dir, 'temp_audio.m4a')  # Explicit temp file location
                )
        
        # Clean up
        video.close()
        audio.close()
        final_video.close()
        
        # Return success response
        result = {
            "success": True,
            "message": "Audio successfully added to video",
            "output_path": output_path
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
            "message": f"Error processing video: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
