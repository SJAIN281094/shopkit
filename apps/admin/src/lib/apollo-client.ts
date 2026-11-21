import { ApolloClient, ApolloLink, CombinedGraphQLErrors, HttpLink, InMemoryCache } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { session } from "./session";

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql",
});

const authLink = new SetContextLink(({ headers }) => {
  const token = session.getToken();
  const shopId = session.getShopId();
  return {
    headers: {
      ...headers,
      ...(token && { authorization: `Bearer ${token}` }),
      ...(shopId && { "x-shop-id": shopId }),
    },
  };
});

const errorLink = new ErrorLink(({ error }) => {
  const unauthenticated =
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED");
  if (unauthenticated && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    session.clear();
    window.location.href = "/login";
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    // One per selected store (the cache is reset when switching stores), so mutation results replace the query's copy.
    typePolicies: {
      ShopSettings: { keyFields: [] },
      BillingOverview: { keyFields: [] },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
  },
});
