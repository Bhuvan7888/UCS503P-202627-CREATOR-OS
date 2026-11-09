// Seeded demo accounts (see backend/features/demo_mode/accounts.py). The demo password is shared.
export const DEMO_PASSWORD = "DemoPass123!";

export interface DemoAccount {
  email: string;
  label: string;
}

export const DEMO_BRAND_ACCOUNTS: DemoAccount[] = [
  { email: "demo.brand1@creatoros.dev", label: "1. Mamaearth" },
  { email: "demo.brand2@creatoros.dev", label: "2. boAt" },
  { email: "demo.brand3@creatoros.dev", label: "3. Nykaa" },
];

export const DEMO_CREATOR_ACCOUNTS: DemoAccount[] = [
  { email: "demo.creator1@creatoros.dev", label: "1. Ananya Sharma (Mamaearth, Nykaa)" },
  { email: "demo.creator2@creatoros.dev", label: "2. Rohan Mehta (Mamaearth)" },
  { email: "demo.creator3@creatoros.dev", label: "3. Zara Khan (Nykaa)" },
  { email: "demo.creator4@creatoros.dev", label: "4. Kabir Anand (boAt)" },
  { email: "demo.creator5@creatoros.dev", label: "5. Ishita Rao (boAt)" },
];
