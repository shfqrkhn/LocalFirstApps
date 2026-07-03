from playwright.sync_api import sync_playwright

def verify_app(page):
    page.goto("http://localhost:8080")

    # Check Recovery Page
    page.wait_for_selector("text=How do you feel?")
    page.screenshot(path="verification_recovery.png")
    print("Recovery page verified")

    # Click Green recovery
    page.click("text=Green - Full Strength")

    # Check Warmup Page
    page.wait_for_selector("text=Warmup")
    page.wait_for_selector("text=Circuit • No Rest")
    page.screenshot(path="verification_warmup.png")
    print("Warmup page verified")

    # Click Start Lifting
    page.click("text=Start Lifting")

    # Check Lifting Page
    page.wait_for_selector("text=Lifting")
    page.wait_for_selector("text=Tempo: 3s down")
    page.screenshot(path="verification_lifting.png")
    print("Lifting page verified")

    # Go to History
    page.click("button[data-view='history']")
    page.wait_for_selector("text=History")
    page.screenshot(path="verification_history.png")
    print("History page verified")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    try:
        verify_app(page)
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification_error.png")
    finally:
        browser.close()
