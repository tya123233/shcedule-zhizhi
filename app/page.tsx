import { ChatWorkspace } from "@/components/chat-workspace";
import { getStorageMode } from "@/lib/scheduler-bot/storage-mode";

export default function Home() {
  return <ChatWorkspace storageMode={getStorageMode()} />;
}
