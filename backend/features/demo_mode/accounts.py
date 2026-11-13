"""Known demo brand and creator accounts (fixed UUIDs used by the seed and demo login)."""

from uuid import UUID

# Shown on the login pages; only accepted while demo access is enabled (see mode.py).
DEMO_PASSWORD = "DemoPass123!"

# --- Known Demo Accounts Definitions ---
DEMO_BRANDS = {
    "demo.brand1@creatoros.dev": {
        "brand_id": UUID("11111111-1111-1111-1111-111111111111"),
        "user_id": UUID("11111111-1111-1111-1111-111111111112"),
        "name": "Mamaearth",
        "desc": "D2C skincare and personal care brand",
    },
    "demo.brand2@creatoros.dev": {
        "brand_id": UUID("22222222-2222-2222-2222-222222222221"),
        "user_id": UUID("22222222-2222-2222-2222-222222222222"),
        "name": "boAt",
        "desc": "Consumer electronics and audio brand",
    },
    "demo.brand3@creatoros.dev": {
        "brand_id": UUID("33333333-3333-3333-3333-333333333331"),
        "user_id": UUID("33333333-3333-3333-3333-333333333332"),
        "name": "Nykaa",
        "desc": "Beauty and fashion marketplace",
    },
}


DEMO_CREATORS = {
    "demo.creator1@creatoros.dev": {
        "creator_id": UUID("44444444-4444-4444-4444-444444444441"),
        "user_id": UUID("44444444-4444-4444-4444-444444444442"),
        "display_name": "Ananya Sharma",
        "handle": "@ananya.beauty",
        "niche": "beauty",
        "tier": "micro",
        "followers": 68000,
        "engagement": 5.2,
        "views": 21000,
        "brand_id": UUID("11111111-1111-1111-1111-111111111111"),
    },
    "demo.creator2@creatoros.dev": {
        "creator_id": UUID("55555555-5555-5555-5555-555555555551"),
        "user_id": UUID("55555555-5555-5555-5555-555555555552"),
        "display_name": "Rohan Mehta",
        "handle": "@rohan.fit",
        "niche": "fitness",
        "tier": "mid",
        "followers": 145000,
        "engagement": 3.8,
        "views": 48000,
        "brand_id": UUID("11111111-1111-1111-1111-111111111111"),
    },
    "demo.creator3@creatoros.dev": {
        "creator_id": UUID("66666666-6666-6666-6666-666666666661"),
        "user_id": UUID("66666666-6666-6666-6666-666666666662"),
        "display_name": "Zara Khan",
        "handle": "@zara.style",
        "niche": "fashion",
        "tier": "micro",
        "followers": 42000,
        "engagement": 6.1,
        "views": 15000,
        "brand_id": UUID("33333333-3333-3333-3333-333333333331"),
    },
    "demo.creator4@creatoros.dev": {
        "creator_id": UUID("77777777-7777-7777-7777-777777777771"),
        "user_id": UUID("77777777-7777-7777-7777-777777777772"),
        "display_name": "Kabir Anand",
        "handle": "@kabir.tech",
        "niche": "tech",
        "tier": "mid",
        "followers": 112000,
        "engagement": 4.5,
        "views": 27000,
        "brand_id": UUID("22222222-2222-2222-2222-222222222221"),
    },
    "demo.creator5@creatoros.dev": {
        "creator_id": UUID("88888888-8888-8888-8888-888888888881"),
        "user_id": UUID("88888888-8888-8888-8888-888888888882"),
        "display_name": "Ishita Rao",
        "handle": "@ishita.travels",
        "niche": "travel",
        "tier": "micro",
        "followers": 53000,
        "engagement": 5.5,
        "views": 17000,
        "brand_id": UUID("22222222-2222-2222-2222-222222222221"),
    },
}
