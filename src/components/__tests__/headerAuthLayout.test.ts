import * as fs from "fs"
import * as path from "path"

describe("OS-7806 marketing header clusters nav with wordmark", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../Header.tsx"),
    "utf8"
  )

  it("uses a max-w-7xl inner bar and left cluster so nav is not space-between isolated", () => {
    expect(src).toContain('className="marketing-header-inner"')
    expect(src).toContain('className="marketing-header-left"')
    expect(src).toContain("maxWidth: '80rem'")
    expect(src).toMatch(/header-hamburger[\s\S]*display: 'none'/)
  })
})
