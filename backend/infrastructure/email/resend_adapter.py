import asyncio
import logging

import resend

from domain.interfaces.email import EmailPort
from shared.config import settings

logger = logging.getLogger(__name__)

class ResendAdapter(EmailPort):
    def __init__(self):
        resend.api_key = settings.TRANSACTIONAL_EMAIL_API_KEY
        # In a real app, you would have a verified sender domain.
        self.sender = "onboarding@resend.dev"

    async def send(self, to: str, subject: str, body: str) -> None:
        params = {
            "from": self.sender,
            "to": to,
            "subject": subject,
            "html": f"<p>{body}</p>",
        }
        
        # Resend SDK is synchronous, so we run it in a threadpool to not block the event loop
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, lambda: resend.Emails.send(params))
            logger.info(f"Email sent to {to} with subject '{subject}'")
        except Exception as e:
            logger.error(f"Failed to send email to {to}: {e}")
            raise
