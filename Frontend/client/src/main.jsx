import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ApolloClient, InMemoryCache, ApolloProvider, ApolloLink, HttpLink, fromPromise } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import App from "./App";
import "./index.css";

const httpLink = new HttpLink({ uri: "/graphql" });

const authLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    operation.setContext({ headers: { authorization: `Bearer ${token}` } });
  }
  return forward(operation);
});

let isRefreshing = false;
let pendingRequests = [];

const resolvePending = () => {
  pendingRequests.forEach((cb) => cb());
  pendingRequests = [];
};

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === "UNAUTHENTICATED") {
        if (!isRefreshing) {
          isRefreshing = true;
          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) {
            localStorage.clear();
            window.location.href = "/login";
            return;
          }
          return fromPromise(
            fetch("/refresh-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.accessToken) {
                  localStorage.setItem("accessToken", data.accessToken);
                  localStorage.setItem("refreshToken", data.refreshToken);
                  resolvePending();
                  return true;
                }
                localStorage.clear();
                window.location.href = "/login";
                return false;
              })
              .catch(() => {
                localStorage.clear();
                window.location.href = "/login";
                return false;
              })
              .finally(() => { isRefreshing = false; })
          ).flatMap(() => forward(operation));
        }
        return fromPromise(new Promise((resolve) => pendingRequests.push(resolve))).flatMap(() => forward(operation));
      }
    }
  }
});

const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
  },
});

export { client };

ReactDOM.createRoot(document.getElementById("root")).render(
    <ApolloProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
);
