def format_inr(amount: float) -> str:
    """Formats a rupee amount with Indian digit grouping (₹5,46,000, not
    ₹546,000) — matches the frontend's toLocaleString("en-IN") rendering,
    so LLM prompts and generated scripts agree with the UI on currency."""
    n = round(amount)
    sign = "-" if n < 0 else ""
    digits = str(abs(n))

    if len(digits) <= 3:
        grouped = digits
    else:
        last3, rest = digits[-3:], digits[:-3]
        groups = []
        while len(rest) > 2:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.insert(0, rest)
        grouped = ",".join(groups) + "," + last3

    return f"{sign}₹{grouped}"
