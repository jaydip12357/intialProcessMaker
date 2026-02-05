import os
from typing import Optional
import pdfplumber
from PyPDF2 import PdfReader


class PDFParser:
    @staticmethod
    async def extract_text(file_path: str) -> str:
        """Extract text from a PDF file using pdfplumber (primary) or PyPDF2 (fallback)"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        # Try pdfplumber first (better for complex layouts)
        try:
            return PDFParser._extract_with_pdfplumber(file_path)
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}, trying PyPDF2")

        # Fallback to PyPDF2
        try:
            return PDFParser._extract_with_pypdf2(file_path)
        except Exception as e:
            raise RuntimeError(f"Failed to extract text from PDF: {e}")

    @staticmethod
    def _extract_with_pdfplumber(file_path: str) -> str:
        """Extract text using pdfplumber"""
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

        full_text = "\n\n".join(text_parts)
        if not full_text.strip():
            raise ValueError("No text extracted from PDF")
        return full_text

    @staticmethod
    def _extract_with_pypdf2(file_path: str) -> str:
        """Extract text using PyPDF2"""
        reader = PdfReader(file_path)
        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        full_text = "\n\n".join(text_parts)
        if not full_text.strip():
            raise ValueError("No text extracted from PDF")
        return full_text

    @staticmethod
    def get_page_count(file_path: str) -> int:
        """Get the number of pages in a PDF"""
        try:
            with pdfplumber.open(file_path) as pdf:
                return len(pdf.pages)
        except Exception:
            reader = PdfReader(file_path)
            return len(reader.pages)

    @staticmethod
    def extract_text_from_bytes(pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes (for in-memory processing)"""
        import io

        try:
            pdf_file = io.BytesIO(pdf_bytes)
            with pdfplumber.open(pdf_file) as pdf:
                text_parts = []
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                return "\n\n".join(text_parts)
        except Exception:
            pdf_file = io.BytesIO(pdf_bytes)
            reader = PdfReader(pdf_file)
            text_parts = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            return "\n\n".join(text_parts)


# Singleton instance
pdf_parser = PDFParser()
