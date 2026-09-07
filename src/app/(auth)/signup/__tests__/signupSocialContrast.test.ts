import * as fs from "fs"
import * as path from "path"

describe("OS-6397 signup Clerk social label contrast", () => {
  const page = fs.readFileSync(
    path.join(__dirname, "../[[...sign-up]]/page.tsx"),
    "utf8"
  )

  it("pins social button labels to #000 on a white button surface", () => {
    expect(page).toContain('const SOCIAL_FG = "#000000"')
    expect(page).toContain('const SOCIAL_BG = "#FFFFFF"')
    expect(page).toContain(".cl-socialButtonsBlockButtonText__apple")
    expect(page).toContain(".cl-socialButtonsBlockButtonText__github")
    expect(page).toContain(".cl-socialButtonsBlockButtonText__google")
    expect(page).toContain("background: ${SOCIAL_BG} !important")
    expect(page).toContain("color: ${SOCIAL_FG} !important")
  })

  it("pins legal copy (.signup-auth > p) to dark ink, not muted gray", () => {
    expect(page).toContain('const LEGAL_FG = "#221F1A"')
    expect(page).toContain(".signup-auth > p")
    expect(page).toContain("color: ${LEGAL_FG} !important")
    expect(page).not.toContain(".signup-auth-card > p { color: #4A4A4A")
  })
})
