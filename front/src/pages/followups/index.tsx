import { IS_SERVER_MODE } from "@/lib/data-mode";
import ServerFollowupsPage from "./index-server";

export default function FollowupsPage() {
  if (IS_SERVER_MODE) return <ServerFollowupsPage />;
  return (
    <div className="p-8 text-[12px] text-muted-foreground">
      Demo 模式未提供随访工作台；请以 server 模式启动前端查看后端随访队列。
    </div>
  );
}
