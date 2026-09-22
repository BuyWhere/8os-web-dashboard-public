import * as fs from "fs"
import * as path from "path"

describe("OS-7806 signup hero / auth-card vertical alignment", () => {
  const page = fs.readFileSync(
    path.join(__dirname, "../[[...sign-up]]/page.tsx"),
    "utf8"
  )

  it("vertically centers the two-column hero so copy and card share a midpoint", () => {
    expect(page).toContain('alignItems: "center"')
    expect(page).toContain('minHeight: "calc(100vh - 5rem)"')
    expect(page).toContain('maxWidth: "80rem"')
    expect(page).not.toContain('alignSelf: "center"')
    expect(page).not.toContain('alignItems: "flex-start"')
  })
})
