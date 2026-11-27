import { Link, useParams } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { ArrowLeft, History } from "lucide-react";
import { getPathway } from "@/data";
import { useCustomPathway } from "@/stores/studio-store";
import { Page, PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/section";
import { Button } from "@/components/ui/button";
import { StudioWorkspace } from "./workspace";

export default function PathwayStudioPage() {
  const { id = "" } = useParams();
  const customPathway = useCustomPathway(id);
  const pathway = getPathway(id) ?? customPathway;

  if (!pathway) {
    return (
      <Page>
        <PageHeader
          module="M03 · 路径设计"
          title="路径设计器"
          description="未找到对应路径模板"
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/pathways">
                <ArrowLeft className="size-3.5" />
                返回路径库
              </Link>
            </Button>
          }
        />
        <div className="rounded-lg border border-line bg-card">
          <EmptyState
            icon={<History className="size-4" />}
            title="路径不存在"
            description={`未找到路径 ID「${id}」。该路径可能已停用或未登记。`}
            action={
              <Button asChild size="sm">
                <Link to="/pathways">返回路径库</Link>
              </Button>
            }
          />
        </div>
      </Page>
    );
  }

  return (
    <ReactFlowProvider>
      <StudioWorkspace key={pathway.id} pathway={pathway} />
    </ReactFlowProvider>
  );
}
