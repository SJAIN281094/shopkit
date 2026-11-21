import Cookies from "js-cookie";

const TOKEN_COOKIE = "sk_token";
const SHOP_KEY = "sk_shop";

export const session = {
  getToken(): string | undefined {
    return Cookies.get(TOKEN_COOKIE);
  },
  setToken(token: string) {
    Cookies.set(TOKEN_COOKIE, token, {
      expires: 1,
      sameSite: "strict",
      secure: window.location.protocol === "https:",
    });
  },
  getShopId(): string | null {
    return typeof window === "undefined" ? null : localStorage.getItem(SHOP_KEY);
  },
  setShopId(shopId: string) {
    localStorage.setItem(SHOP_KEY, shopId);
  },
  clearShopId() {
    localStorage.removeItem(SHOP_KEY);
  },
  clear() {
    Cookies.remove(TOKEN_COOKIE);
    localStorage.removeItem(SHOP_KEY);
  },
};
