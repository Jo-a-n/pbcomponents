'use client'
import Link from 'next/link'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card"
import {
  Frame,
  FrameTitle,
  FrameAction,
} from "@/components/frame"


export default function Home() {

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">

        <div className="absolute top-6 right-16">
          <Link
            href="/library"
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Open Library
          </Link>
        </div>

      <main className="flex flex-col justify-center gap-6 p-24 mx-32">

          <Card>
            <CardHeader>
              <CardTitle>
                This is the real title
              </CardTitle>
              <CardDescription>
                wowowow what an amazing description
              </CardDescription>
              <CardAction>
                Now Act!
              </CardAction>
            </CardHeader>
            <CardContent>
              <p>Card Content</p>
            </CardContent>
            <CardFooter>
              <p>Card Footer</p>
            </CardFooter>
          </Card>
          
          <Frame>
            <FrameTitle>
              This is a test component card, this is not the component, you know that because you are reading it right now.
            </FrameTitle>
            <FrameAction>
              That'a a Frame named "Frame Action"
            </FrameAction>
          </Frame>

      </main>

    </div>
  );
}
