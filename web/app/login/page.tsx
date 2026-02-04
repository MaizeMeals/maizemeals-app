import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold">
          Welcome to MaizeMeals
        </h1>
        <p className="mt-3 text-lg">
          Please sign in with your umich.edu Google account to continue.
        </p>
        <form action="/auth/login" method="post">
          <Button className="mt-4">
            Sign in with Google
          </Button>
        </form>
      </main>
    </div>
  )
}
