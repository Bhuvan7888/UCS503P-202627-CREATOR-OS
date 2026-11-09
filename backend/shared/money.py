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


def demo() -> None:
    assert format_inr(546000) == "₹5,46,000"
    assert format_inr(464100) == "₹4,64,100"
    assert format_inr(999) == "₹999"
    assert format_inr(1000) == "₹1,000"
    assert format_inr(12345678) == "₹1,23,45,678"
    assert format_inr(-5000) == "-₹5,000"


if __name__ == "__main__":
    demo()
    print("ok")
