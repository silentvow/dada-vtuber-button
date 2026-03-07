export const useSnackbar = () => {
  // useState 會在整個 App 中共享這兩個變數
  const isVisible = useState<boolean>("snackbar-visible", () => false);
  const message = useState<string>("snackbar-message", () => "");

  // 觸發顯示 Snackbar 的方法
  const show = (msg: string) => {
    message.value = msg;
    isVisible.value = true;
  };

  return {
    isVisible,
    message,
    show,
  };
};
