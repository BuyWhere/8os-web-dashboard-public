import * as fs from "fs"
import * as path from "path"

describe("OS-7220 signup hero / auth-card vertical alignment", () => {
  const page = fs.readFileSync(
    path.join(__dirname, "../[[...sign-up]]/page.tsx"),
    "utf8"
  )

  it("top-aligns both columns instead of vertically centering the taller auth card", () => {
    expect(page).toContain('alignItems: "flex-start"')
    expect(page).toContain('alignSelf: "start"')
    expect(page).not.toContain('alignSelf: "center"')
  })
})
