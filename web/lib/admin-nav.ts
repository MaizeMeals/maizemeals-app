/** Child routes linked from `/admin` and documented for admins. */
export const ADMIN_SECTIONS = [
  {
    href: "/admin/users",
    title: "Users",
    description: "Find an account: profile, reviews (including anonymous ones), activity, suspend.",
  },
  {
    href: "/admin/reviews",
    title: "Reviews",
    description: "Latest reviews with their real authors. Filter anonymous, low ratings, photos; delete.",
  },
  {
    href: "/admin/feedback",
    title: "Feedback",
    description: "Ideas, bug reports and praise sent from the app, by guests and signed-in users.",
  },
  {
    href: "/admin/photos",
    title: "Photo moderation",
    description: "Approve or reject user-submitted item photos.",
  },
] as const;
