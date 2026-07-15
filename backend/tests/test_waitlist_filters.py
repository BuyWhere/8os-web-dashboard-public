from app.services import is_test_waitlist_entry


def test_waitlist_classifier_keeps_real_signups():
    assert not is_test_waitlist_entry('founder@realcompany.com', 'coming-soon')


def test_waitlist_classifier_flags_known_test_sources():
    assert is_test_waitlist_entry('founder@realcompany.com', 'drake-heartbeat')
    assert is_test_waitlist_entry('founder@realcompany.com', 'smoke-probe')
    assert is_test_waitlist_entry('founder@realcompany.com', 'verify-prod-flow')


def test_waitlist_classifier_flags_test_email_patterns():
    assert is_test_waitlist_entry('person@example.com', 'coming-soon')
    assert is_test_waitlist_entry('person@paperclip.example', 'homepage')
    assert is_test_waitlist_entry('verify-123@realcompany.com', 'homepage')
    assert is_test_waitlist_entry('sage-alice@realcompany.com', 'homepage')
