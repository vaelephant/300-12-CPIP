import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StudioDialogsProps {
  pendingDelete: { nodeIds: string[]; edgeIds: string[] } | null;
  onPendingDeleteOpenChange: (open: boolean) => void;
  onConfirmDelete: () => void;
  submitBlockedOpen: boolean;
  onSubmitBlockedOpenChange: (open: boolean) => void;
  errorCount: number;
  onViewValidation: () => void;
  submitConfirmOpen: boolean;
  onSubmitConfirmOpenChange: (open: boolean) => void;
  versionLabel: string;
  onConfirmSubmit: () => void;
}

export function StudioDialogs({
  pendingDelete,
  onPendingDeleteOpenChange,
  onConfirmDelete,
  submitBlockedOpen,
  onSubmitBlockedOpenChange,
  errorCount,
  onViewValidation,
  submitConfirmOpen,
  onSubmitConfirmOpenChange,
  versionLabel,
  onConfirmSubmit,
}: StudioDialogsProps) {
  return (
    <>
      <AlertDialog open={pendingDelete !== null} onOpenChange={onPendingDeleteOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除选中元素？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除 {pendingDelete?.nodeIds.length ?? 0} 个节点与 {pendingDelete?.edgeIds.length ?? 0}{" "}
              条连线，并同步移除关联连线。该操作仅作用于当前草稿，保存后不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/92"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={submitBlockedOpen} onOpenChange={onSubmitBlockedOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>提交审核已被阻断</AlertDialogTitle>
            <AlertDialogDescription>
              当前版本存在 {errorCount} 项阻断性错误，路径不可提交审核。请在校验面板中定位问题节点并修复；
              可使用「模拟修复」完成结构校验后继续审核。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>返回修复</AlertDialogCancel>
            <AlertDialogAction onClick={onViewValidation}>查看校验详情</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={submitConfirmOpen} onOpenChange={onSubmitConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>提交版本审核？</AlertDialogTitle>
            <AlertDialogDescription>
              版本 {versionLabel} 将提交医务处审核，审核通过后由具备发布权限的角色发布生效。
              提交后当前设计器进入只读审核视图，如需继续修改请创建新版本。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmSubmit}>提交审核</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
