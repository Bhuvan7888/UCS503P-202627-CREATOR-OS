from features.contract_intelligence import detect_flags


def test_detect_flags_perpetual_usage():
    text = "The brand gets perpetual usage rights for this video."
    flags = detect_flags(text, "usage_rights")
    assert len(flags) == 1
    assert flags[0].flag == "red"
    assert flags[0].reason_code == "perpetual_usage_rights"


def test_detect_flags_unpaid_whitelisting():
    text = "Creator agrees to unpaid whitelisting/boosting."
    flags = detect_flags(text, "exclusivity")
    assert len(flags) == 1
    assert flags[0].flag == "red"
    assert flags[0].reason_code == "unpaid_whitelisting"


def test_detect_flags_unlimited_revisions():
    text = "The client expects unlimited revisions."
    flags = detect_flags(text, "revisions")
    assert len(flags) == 1
    assert flags[0].flag == "red"
    assert flags[0].reason_code == "unlimited_revisions"


def test_detect_flags_extended_exclusivity():
    text = "There will be exclusivity beyond campaign window."
    flags = detect_flags(text, "exclusivity")
    assert len(flags) == 1
    assert flags[0].flag == "red"
    assert flags[0].reason_code == "extended_exclusivity"


def test_detect_flags_clean():
    text = "Usage rights are limited to 30 days."
    flags = detect_flags(text, "usage_rights")
    assert len(flags) == 0
