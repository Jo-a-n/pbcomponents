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
import { StyleEditor } from '@/components/StyleEditor'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="w-full grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card Description</CardDescription>
              <CardAction>Card Action</CardAction>
            </CardHeader>
            <CardContent>
              <p>Card Content</p>
            </CardContent>
            <CardFooter>
              <p>Card Footer</p>
            </CardFooter>
          </Card>
          <Frame>
            <FrameTitle>Card Title Card TitleCard TitleCard TitleCard TitleCard TitleCard TitleCard TitleCard Title</FrameTitle>
            <FrameAction>Card Action</FrameAction>
          </Frame>
        </div>  
        
      </main>
      <div className="p-4">
        <StyleEditor />
      </div>
    </div>
  );
}
