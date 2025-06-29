#!/usr/bin/env python3
"""
CodebaseCollector: A utility to collect all Java and YAML files from a multi-module project
and combine them into a single file for sharing with LLMs like Claude.

Usage:
    python codebase_collector.py [--src /path/to/project] [--output combined_code.txt] [--extensions java,yaml,yml] [--ignore target,build,.git] [--format markdown]

All arguments are optional with sensible defaults.
No external dependencies required.
"""

import os
import argparse
import fnmatch
from pathlib import Path
from typing import List, Set, Dict
import re
import logging

# Default configuration values
DEFAULT_SOURCE_DIR = "."
DEFAULT_OUTPUT_FILE = "combined_code.txt"
DEFAULT_EXTENSIONS = ["java", "yaml", "yml", "js", "jsx", ".local"]
DEFAULT_IGNORE_PATTERNS = ["target", "build", ".git", ".idea", "node_modules", ".gradle", ".next"]
DEFAULT_IGNORE_DIRECTORIES = ["test", "tests", "src/test", "*/test", "*/tests", "frontend/out/_next/static/chunks"]
DEFAULT_IGNORE_FILE_PATTERNS = ["*Test.java", "*Tests.java", "*IT.java", "*ITCase.java", "*TestCase.java", "layout.js", "chunks", "_buildManifest.js", "_ssgManifest.js"]
DEFAULT_OUTPUT_FORMAT = "plain"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class CodebaseCollector:
    """Collects code files from a project directory and combines them into a single file."""

    def __init__(
            self,
            source_dir: str,
            output_file: str,
            extensions: List[str] = None,
            ignore_patterns: List[str] = None,
            ignore_directories: List[str] = None,
            ignore_file_patterns: List[str] = None,
            output_format: str = None
    ):
        """
        Initialize the CodebaseCollector.

        Args:
            source_dir: Path to the source project directory
            output_file: Path where the combined output will be written
            extensions: File extensions to include
            ignore_patterns: Directory or file patterns to ignore
            ignore_directories: Directory names to ignore
            ignore_file_patterns: File name patterns to ignore
            output_format: Output format ("plain" or "markdown")
        """
        self.source_dir = os.path.abspath(source_dir)
        self.output_file = output_file
        self.extensions = extensions or DEFAULT_EXTENSIONS
        self.ignore_patterns = ignore_patterns or DEFAULT_IGNORE_PATTERNS
        self.ignore_directories = ignore_directories or DEFAULT_IGNORE_DIRECTORIES
        self.ignore_file_patterns = ignore_file_patterns or DEFAULT_IGNORE_FILE_PATTERNS
        self.output_format = output_format or DEFAULT_OUTPUT_FORMAT
        self.total_files = 0
        self.total_lines = 0
        self.stats: Dict[str, int] = {ext: 0 for ext in self.extensions}

    def is_ignored(self, path: str) -> bool:
        """Check if a path should be ignored based on ignore patterns."""
        # Check if any part of the path matches the ignore patterns
        path_parts = path.split(os.path.sep)
        for part in path_parts:
            for pattern in self.ignore_patterns:
                if fnmatch.fnmatch(part, pattern):
                    return True

        # Check if the path is in or contains an ignored directory
        for ignored_dir in self.ignore_directories:
            if ignored_dir in path or f"{os.path.sep}{ignored_dir}{os.path.sep}" in path:
                return True

        # For file paths (not directory paths), check against file patterns
        if os.path.isfile(path):
            filename = os.path.basename(path)
            for pattern in self.ignore_file_patterns:
                if fnmatch.fnmatch(filename, pattern):
                    return True

        return False

    def find_files(self) -> List[str]:
        """Find all files with the specified extensions in the source directory."""
        files = []
        logger.info(f"Scanning directory: {self.source_dir}")

        for root, _, filenames in os.walk(self.source_dir):
            if self.is_ignored(root):
                continue

            for filename in filenames:
                file_path = os.path.join(root, filename)

                # Skip ignored patterns
                if self.is_ignored(file_path):
                    continue

                # Check if the file has one of the target extensions
                ext = os.path.splitext(filename)[1].lstrip('.')
                if ext in self.extensions:
                    files.append(file_path)
                    self.stats[ext] = self.stats.get(ext, 0) + 1

        self.total_files = len(files)
        logger.info(f"Found {self.total_files} files to process")
        return files

    def detect_encoding(self, file_path: str) -> str:
        """
        Simple encoding detection without external dependencies.
        Tries UTF-8 first, then falls back to latin-1.
        """
        try:
            with open(file_path, 'rb') as f:
                sample = f.read(min(1024, os.path.getsize(file_path)))

            # Check for UTF-8 BOM
            if sample.startswith(b'\xef\xbb\xbf'):
                return 'utf-8-sig'

            # Try decoding as UTF-8
            sample.decode('utf-8')
            return 'utf-8'
        except UnicodeDecodeError:
            # If UTF-8 fails, default to latin-1
            return 'latin-1'
        except Exception:
            # Any other error, default to utf-8
            return 'utf-8'

    def read_file(self, file_path: str) -> str:
        """Read a file with appropriate encoding handling."""
        rel_path = os.path.relpath(file_path, self.source_dir)
        try:
            # Try to detect encoding first
            encoding = self.detect_encoding(file_path)
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
                # Count lines for statistics
                line_count = content.count('\n') + 1
                self.total_lines += line_count
                return content
        except UnicodeDecodeError:
            logger.warning(f"Unable to decode {rel_path} with detected encoding. Falling back to latin-1")
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    content = f.read()
                    line_count = content.count('\n') + 1
                    self.total_lines += line_count
                    return content
            except Exception as e:
                logger.error(f"Error reading {rel_path}: {str(e)}")
                return f"[Error reading file: {str(e)}]"
        except Exception as e:
            logger.error(f"Error reading {rel_path}: {str(e)}")
            return f"[Error reading file: {str(e)}]"

    def format_file_header(self, file_path: str) -> str:
        """Format the header for a file based on the output format."""
        rel_path = os.path.relpath(file_path, self.source_dir)
        file_name = os.path.basename(file_path)

        if self.output_format == "markdown":
            ext = os.path.splitext(file_path)[1].lstrip('.')
            lang = "java" if ext == "java" else "yaml"
            return f"\n\n## {rel_path}\n```{lang}\n"
        else:
            return f"\n\n--- {rel_path} ---\n"

    def format_file_footer(self, file_path: str) -> str:
        """Format the footer for a file based on the output format."""
        if self.output_format == "markdown":
            return "```\n"
        else:
            return "\n"

    def combine_files(self) -> None:
        """Combine all found files into a single output file."""
        files = self.find_files()

        if not files:
            logger.warning("No files found matching the specified criteria")
            return

        # Ensure we're writing to the file, not appending
        # 'w' mode already does this, but let's be explicit about it
        if os.path.exists(self.output_file):
            logger.info(f"Overwriting existing file: {self.output_file}")

        with open(self.output_file, 'w', encoding='utf-8') as out_file:
            # Write header with information about the project
            project_name = os.path.basename(self.source_dir)

            if self.output_format == "markdown":
                out_file.write(f"# Project: {project_name}\n\n")
                out_file.write("## File Inventory\n\n")
                for ext, count in self.stats.items():
                    if count > 0:
                        out_file.write(f"- {count} .{ext} files\n")
                out_file.write(f"\nTotal: {self.total_files} files\n")
            else:
                out_file.write(f"PROJECT: {project_name}\n")
                out_file.write(f"FILE INVENTORY:\n")
                for ext, count in self.stats.items():
                    if count > 0:
                        out_file.write(f"- {count} .{ext} files\n")
                out_file.write(f"Total: {self.total_files} files\n")

            # Write each file with appropriate headers and footers
            for file_path in sorted(files):
                rel_path = os.path.relpath(file_path, self.source_dir)
                logger.debug(f"Processing: {rel_path}")

                file_content = self.read_file(file_path)

                out_file.write(self.format_file_header(file_path))
                out_file.write(file_content)
                out_file.write(self.format_file_footer(file_path))

        # Log statistics
        logger.info(f"Successfully combined {self.total_files} files ({self.total_lines} lines) into {self.output_file}")
        for ext, count in self.stats.items():
            if count > 0:
                logger.info(f"- {count} .{ext} files")

def main():
    """Parse command line arguments and run the collector."""
    parser = argparse.ArgumentParser(
        description='Collect all Java and YAML files from a project into a single file for LLM processing.'
    )
    parser.add_argument(
        '--src',
        default=DEFAULT_SOURCE_DIR,
        help=f'Source directory of the project (default: {DEFAULT_SOURCE_DIR})'
    )
    parser.add_argument(
        '--output',
        default=DEFAULT_OUTPUT_FILE,
        help=f'Output file path (default: {DEFAULT_OUTPUT_FILE})'
    )
    parser.add_argument(
        '--extensions',
        default=','.join(DEFAULT_EXTENSIONS),
        help=f'Comma-separated list of file extensions to include (default: {",".join(DEFAULT_EXTENSIONS)})'
    )
    parser.add_argument(
        '--ignore',
        default=','.join(DEFAULT_IGNORE_PATTERNS),
        help=f'Comma-separated list of patterns to ignore (default: {",".join(DEFAULT_IGNORE_PATTERNS)})'
    )
    parser.add_argument(
        '--ignore-dirs',
        default=','.join(DEFAULT_IGNORE_DIRECTORIES),
        help=f'Comma-separated list of directories to ignore (default: {",".join(DEFAULT_IGNORE_DIRECTORIES)})'
    )
    parser.add_argument(
        '--ignore-files',
        default=','.join(DEFAULT_IGNORE_FILE_PATTERNS),
        help=f'Comma-separated list of file patterns to ignore (default: {",".join(DEFAULT_IGNORE_FILE_PATTERNS)})'
    )
    parser.add_argument(
        '--format',
        choices=['plain', 'markdown'],
        default=DEFAULT_OUTPUT_FORMAT,
        help=f'Output format (plain or markdown, default: {DEFAULT_OUTPUT_FORMAT})'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    # Set logging level based on verbose flag
    if args.verbose:
        logger.setLevel(logging.DEBUG)

    # Parse comma-separated arguments
    extensions = [ext.strip() for ext in args.extensions.split(',')]
    ignore_patterns = [pat.strip() for pat in args.ignore.split(',')]
    ignore_directories = [dir.strip() for dir in args.ignore_dirs.split(',')]
    ignore_file_patterns = [pat.strip() for pat in args.ignore_files.split(',')]

    collector = CodebaseCollector(
        args.src,
        args.output,
        extensions=extensions,
        ignore_patterns=ignore_patterns,
        ignore_directories=ignore_directories,
        ignore_file_patterns=ignore_file_patterns,
        output_format=args.format
    )

    try:
        collector.combine_files()
        logger.info(f"Output written to: {os.path.abspath(args.output)}")
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
