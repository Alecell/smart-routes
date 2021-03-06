# Smart Routes ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-green.svg "PRs Welcome")


A framework agnostic simple and lightweight way to create and reuse routes on web apps.

**IMPORTANT:** This **isn't** a router like `vue-router` or `react-router`. Smart Routes just brings a simplified and safer way to declare and reuse routes.


## Motivation
As our web application grow, its amount of routes grows too. Apps with 20, 30, 40 and more routes variations can be really messy to deal with, even more when we add dynamic routing. 

That kind of thing came with some problems like:
* Links leading to unexpected route;
* Send parameter to a not parameterized route;
* Non intelligible routes names;
* Work around to apply parameters;
* Forget to replace a link when an entirely route needs to be changed.

A routes single source of truth allows to better organize your routes, better use them and prevent routing mistakes. 


## Install
### npm
```
npm install smart-routes
```
### yarn
```
yarn add smart-routes
```


## Basic usage
Import `Route` from the package
```
import { Route } from 'smart-routes';
```

Crete your route

```js
const routes = {
  user: new Route('/user')
}
```

Defining route 

```jsx
<Route path={routes.user().path} component={SomeComponent} />
```

Link like this

```jsx
// Leads to /user
<Link to={routes.user().path}> 
  // ...
</Link>
```


## Route parameters
```js
const routes = {
  user: new Route('/user', ':userId')
}
```

```jsx
//  `routes.user().path` leads to /user/:userId
<Route path={routes.user().path} component={SomeComponent} />
```

```jsx
const someUserId = 123;

// Leads to /user/123
<Link to={routes.user(someUserId).exec()}>
  // ...
</Link>
```


## Subroutes
```js
const routes = {
  user: new Route('/user', {
    info: new Route('/info')
  })
}
```

```jsx
<Route path={routes.user().info().path} component={SomeComponent} />
```

```jsx
// Leads to /user/info
<Link to={routes.user().info().path}> 
  // ...
</Link>
```


## Complete example
```js
const routes = {
  user: new Route('user', ':userId', {
    info: new Route('info'),
    cart: new Route('cart', {
      item: new Route('item', ':itemId')
    })
  })
}
```

```jsx
//  /user/:userId
<Route path={routes.user().path} component={SomeComponent} />

//  /user/:userId/info
<Route path={routes.user().info().path} component={SomeComponent1} />

//  /user/:userId/cart
<Route path={routes.user().cart().path} component={SomeComponent2} />

//  /user/:userId/cart/item/:itemId
<Route path={routes.user().cart().item().path} component={SomeComponent3} />
```

```jsx
//  Leads to /user/123
<Link to={routes.user(123).path}> 
  ...
</Link>

//  Leads to /user/123/info
<Link to={routes.user(123).info().path}> 
  ...
</Link>

//  Leads to /user/123/cart
<Link to={routes.user(123).cart().path}> 
  ...
</Link>

// Leads to /user/123/cart/item/456
<Link to={routes.user(123).cart().item(456).path}> 
  ...
</Link>
```
