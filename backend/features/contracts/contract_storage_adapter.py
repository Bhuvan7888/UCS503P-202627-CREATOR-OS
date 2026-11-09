import asyncio

from supabase import Client

from features.demo_mode import is_demo_mode


class SupabaseStorage:
    def __init__(self, client: Client):
        self.client = client

    async def upload_file(self, bucket: str, path: str, content: bytes) -> str:
        if is_demo_mode():
            return path
        # supabase-py storage operations are synchronous — offload so they don't block the event loop
        await asyncio.to_thread(
            self.client.storage.from_(bucket).upload,
            path=path,
            file=content,
            file_options={"upsert": "true"},
        )
        return path

    async def get_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        if is_demo_mode():
            return f"https://example.com/{path}"
        res = await asyncio.to_thread(
            self.client.storage.from_(bucket).create_signed_url, path, expires_in
        )
        return res["signedURL"]
