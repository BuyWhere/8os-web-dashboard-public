import { blogPosts } from '@/lib/content/blog'

function formatIsoDate(isoDate: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00.000Z`))
}

describe('blog post metadata', () => {
  it('does not publish public blog posts with future dates', () => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const futurePosts = blogPosts.filter((post) => {
      const publishedAt = new Date(`${post.isoDate}T00:00:00.000Z`)
      return publishedAt.getTime() > today.getTime()
    })

    expect(futurePosts).toEqual([])
  })

  it('keeps display dates in sync with ISO publish dates', () => {
    const mismatchedPosts = blogPosts.filter((post) => post.date !== formatIsoDate(post.isoDate))

    expect(mismatchedPosts).toEqual([])
  })
})
