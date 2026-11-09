from shared.money import format_inr


def test_format_inr_uses_indian_digit_grouping():
    assert format_inr(546000) == "₹5,46,000"
    assert format_inr(464100) == "₹4,64,100"
    assert format_inr(999) == "₹999"
    assert format_inr(1000) == "₹1,000"
    assert format_inr(12345678) == "₹1,23,45,678"
    assert format_inr(-5000) == "-₹5,000"
