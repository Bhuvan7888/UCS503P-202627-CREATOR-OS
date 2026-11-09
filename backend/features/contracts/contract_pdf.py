import io
import logging

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject,
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
    NumberObject,
)

logger = logging.getLogger(__name__)


def extract_text(pdf_bytes: bytes) -> str:
    """Best-effort text extraction. Returns "" for scanned/image-only PDFs
    or anything that fails to parse — callers should treat that as
    "nothing to scan" rather than an error."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        logger.exception("Failed to extract text from uploaded PDF")
        return ""


def generate_sample_contract_pdf() -> bytes:
    """Generates a valid PDF sample contract with standard clauses and realistic red flags
    (perpetual usage rights and unlimited revisions) for testing the contract scanner."""
    writer = PdfWriter()
    stream = DecodedStreamObject()
    content = b"""BT
/F1 14 Tf
50 740 Td
(BRAND COLLABORATION AGREEMENT - SAMPLE) Tj
/F1 10 Tf
0 -30 Td
(This agreement outlines the terms between Brand and Creator for social media content.) Tj
0 -25 Td
(1. DELIVERABLES: Creator shall produce 1x high-quality 60-second video reel and 2x Instagram stories.) Tj
0 -25 Td
(2. USAGE RIGHTS: Brand is granted irrevocable, perpetual usage rights to all content across all media.) Tj
0 -25 Td
(3. REVISIONS: Creator agrees to provide unlimited revisions until full brand satisfaction is reached.) Tj
0 -25 Td
(4. EXCLUSIVITY: Creator shall not endorse competing category brands for 30 days post-campaign.) Tj
0 -25 Td
(5. COMPENSATION: Brand shall pay the Creator INR 15,000 within 30 days of deliverable completion.) Tj
0 -30 Td
(Signed and agreed by both parties.) Tj
ET"""
    stream.set_data(content)
    stream_ref = writer._add_object(stream)

    font_dict = DictionaryObject({
        NameObject('/Type'): NameObject('/Font'),
        NameObject('/Subtype'): NameObject('/Type1'),
        NameObject('/BaseFont'): NameObject('/Helvetica'),
    })
    font_ref = writer._add_object(font_dict)

    res_dict = DictionaryObject({
        NameObject('/Font'): DictionaryObject({NameObject('/F1'): font_ref})
    })

    page_dict = DictionaryObject({
        NameObject('/Type'): NameObject('/Page'),
        NameObject('/MediaBox'): ArrayObject([NumberObject(0), NumberObject(0), NumberObject(612), NumberObject(792)]),
        NameObject('/Contents'): stream_ref,
        NameObject('/Resources'): res_dict,
    })
    page_ref = writer._add_object(page_dict)

    pages_dict = DictionaryObject({
        NameObject('/Type'): NameObject('/Pages'),
        NameObject('/Kids'): ArrayObject([page_ref]),
        NameObject('/Count'): NumberObject(1),
    })
    pages_ref = writer._add_object(pages_dict)
    page_dict[NameObject('/Parent')] = pages_ref

    writer._root_object[NameObject('/Pages')] = pages_ref

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

