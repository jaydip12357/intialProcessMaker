"""PDF parsing service for extracting text from documents."""
from PyPDF2 import PdfReader
from typing import Optional
import os


class PDFParser:
    """Service for extracting text from PDF documents."""
    
    def extract_text(self, file_path: str) -> Optional[str]:
        """
        Extract text content from a PDF file.
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text or None if extraction fails
        """
        if not os.path.exists(file_path):
            return None
        
        try:
            reader = PdfReader(file_path)
            text_parts = []
            
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            
            return "\n\n".join(text_parts) if text_parts else None
            
        except Exception as e:
            print(f"PDF extraction error for {file_path}: {e}")
            return None
    
    def extract_text_from_bytes(self, pdf_bytes: bytes) -> Optional[str]:
        """
        Extract text from PDF bytes.
        
        Args:
            pdf_bytes: PDF file content as bytes
            
        Returns:
            Extracted text or None if extraction fails
        """
        try:
            from io import BytesIO
            reader = PdfReader(BytesIO(pdf_bytes))
            text_parts = []
            
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            
            return "\n\n".join(text_parts) if text_parts else None
            
        except Exception as e:
            print(f"PDF extraction error from bytes: {e}")
            return None


# Singleton instance
pdf_parser = PDFParser()
