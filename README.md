<h1 align="center">MayaJS Router</h1>
<p align="center"><img src="https://github.com/mayajs/maya/blob/master/maya.svg" ></p>
<h2 align="center">Lightweight, simple and fast NodeJS Router developed using Typescript.</h2>
<p align="center">
  <a href="https://www.npmjs.com/package/@mayajs/router"><img src="https://img.shields.io/npm/v/@mayajs/router.svg?style=for-the-badge&logo=appveyor" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@mayajs/router"><img src="https://img.shields.io/npm/dm/@mayajs/router.svg?style=for-the-badge&logo=appveyor" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/@mayajs/router"><img src="https://img.shields.io/npm/l/@mayajs/router?style=for-the-badge&logo=appveyor" alt="License"></a>
  <a href="https://github.com/microsoft/typescript-tslint-plugin"><img src="https://img.shields.io/badge/code%20style-standard-blue.svg?style=for-the-badge&logo=appveyor" alt="Code Style"></a>
</p>

## Motivation

Yup another **ExpressJS** like library. We develop **@mayajs/router** not to compete but to have our own router for our other projects like [@mayajs/router](https://github.com/mayajs/maya#readme). As much as possible we don't want to rely on other framework/library to create our own projects. This is just for maintainability and ease of transition for future updates.

## Roadmap

You can see the detail roadmap of the project [here.](https://github.com/mayajs/router/blob/master/ROADMAP.md)

## Suggestions

For suggestions and features you want to see in the future you can visit our [issues section.](https://github.com/mayajs/router/issues)

## Getting started

Before installing this package make sure to download and install Node.js 10 or higher.

To check your node version

```shell
npm -v
```

For new project kindly initialize npm using the command below or see documentation [here](https://docs.npmjs.com/creating-a-package-json-file).

```shell
npm init
```

Install typescript and typescript watcher

```shell
npm i typescript ts-node-dev -D
```

Installation via command-line

```shell
npm i @mayajs/router
```

Add `start` script in your `package.json`

```js
"scripts": {
  "start": "tsnd src"
}
```

## Features

- Simple interface
- Built with TypeScript
- Uses native Nodejs API
- Supports beginners to advance syntaxes
- Can be use both `Function` based and `Class` based coding style
- Dependency Injection
- Fast execution
- Easy to learn
- Modular code

## Quick Start

The easiest way to get started is to create a simple route. Create a `src` folder inside your project folder. Inside the `src` folder create an `index.ts` file. Copy the code below inside the `index.ts` file.

```ts
import maya from "@mayajs/router";
import http from "http";

const PORT = 3000;
const app = maya();

app.add([
  {
    path: "/",
    GET: () => "Hello, World",
  },
]);

http.createServer(app).listen(PORT, () => console.log(`Server listening on port ${PORT}.`));
```

### RUN

To run your mayajs project open a terminal inside your current project and run the command below.

```shell
npm start
```

## ROUTE

Defining routes in MayaJs is like creating a JSON object.

```ts
const user = {
  path: "user",
  GET: () => {
    //  ...
  },
  POST: () => {
    //  ...
  },
  PUT: () => {
    //  ...
  },
  PATCH: () => {
    //  ...
  },
  DELETE: () => {
    //  ...
  },
  OPTIONS: () => {
    //  ...
  },
};
```

As seen above each method name has a `callback` function. Mayajs will set the correct `content-type` based on what the method callback will return.

```ts
const route = {
  path: "user",
  GET: () => {
    // This will return `undefined`
    // This will have a content-type of "text/plain"
  },
  POST: () => {
    return "Hello"; // This will have a content-type of "text/plain"
  },
  PUT: () => {
    return { message: "Hello" }; // This will have a content-type of "application/json"
  },
  PATCH: () => {
    return "<h1>Hello</h1>"; // This will have a content-type of "text/html"
  },
};
```

Incase you need to use a middleware for an specific route method you need to create a route object instead.

```ts
const route = {
  path: "user",
  GET: {
    middlewares: [middleware],
    callback: () => {
      // ...
    },
  },
};
```

## PARAMS

MayaJs passes a context object on each route method. You can acces the route params by destructuring the context object on the callback method.

```ts
const route = {
  path: "user/:id",
  GET: ({ params }) => {
    // `params` object contains the value of `id` define on the path above e.g. `user/hello`
    return params.id; // This has a value of "hello"
  },
};
```

## QUERY STRING

You can also access the query string using the context object provided by MayaJs on your route method callback function.

```ts
const route = {
  path: "user",
  GET: ({ query }) => {
    // `query` object contains all the value on your query string e.g. `user?id=1`
    return query.id; // This has a value of 1
  },
};
```

## BODY

Request body is also accessible in the context but you need a middleware before you can actually uses. There is a popular middleware called [body-parser](https://www.npmjs.com/package/body-parser) that we can use to achieve this.

```ts
import maya from "@mayajs/router";
// Third party middleware you need to install
import bodyParser from "body-parser";

const app = maya();

// Initialize body parser for mayajs to use it internally
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const route = {
  path: "user",
  POST: ({ body }) => {
    // `body` object contains all the value from the request body
    return body; // This has a value of req.body
  },
};

app.add([route]);
```

## MIDDLEWARES

As seen above how we used third party middlewares to parse the request body. We can also create our own middlewares. Although MayaJs supports all [ExpressJs Middlewares](https://expressjs.com/en/resources/middleware.html), we also can create a `MayaJsMiddleware` of our own. The context is where you can access `params, query and body` objects.

```ts
router.use((context, next, error) => {
  // This `error` variable comes from the previous middleware
  console.log(error);

  // The `next` function will trigger the end of this callback function
  // and execute the next middleware in the list
  next("Error message or any value that you want to pass to the next middleware");
});
```

## CHILD ROUTES

A child route is a route that appended to its parent route. It can be added using the `children` property from the route object.

```ts
const child = {
  path: "child",
  GET: () => "This is from a child route", // You can call this route by `users/child`
};

const parent = {
  path: "user",
  children: [child], // This is a list of routes.
};

app.add([parent]);
```

## CONTROLLER

A controller is a class that act as a replacement for the route method objects. It can be used to make your code more modular and manageable when your code base get bigger.

```ts
class UsersController extends Controller {
  GET() {
    return "Hello form UsersController";
  }

  // You can also add additional route method like this
  POST() {
    // ...
  }

  // Other routes available are PUT, PATCH, DELETE and OPTIONS
}

app.add([
  {
    path: "user",
    controller: UsersController,
  },
]);
```

If you want to add middleware a middleware to a specific method you can add the `middleware` property in a controller.

```ts
class UsersController extends Controller {
  middleware = {
    GET: [middleware], // This middleware will be added to the `GET` method below
  };

  GET() {
    //  ...
  }
}
```

```
NOTE: A controller has no `children` property
```

## SERVICES

A service is an injectable class that can be used inside of a controller or another service.

```ts
export class UsersServices extends Services {
  // Every function inside the service can be accessed by the class its injected
  // All public properties are also accessible
  // A service is instatiated once and making it a singleton

  add() {
    // ...
  }
}

class UsersController extends Controller {
  constructor(userServices: UsersServices) {
    super();
  }

  addUser() {
    // This `add` function coming from the `UsersService`.
    // It is accessible on this controller via dependency injection.
    // MayaJs automatically instantiated it and created it singleton instance.
    this.userServices.add();
  }
}
```

```
NOTE: A `child` route can also have its own `children`.
```

## MODULE

A module is a like a container of routes, controller and services that act on its own. This will allow your code to modular and shareable accross all routes.

```ts
class UsersModule extends MayaJsModule {
  // List of `module` or `services` that this module will use for its controllers
  imports = [];
  // List of controllers that this module will use
  declarations = [];
  // List of services that can be use inside this module
  providers = [];
  // List of services that this module will exports that can be used by other modules
  exports = [];
  // List of dependencies that will be injected to this module
  dependencies = [];
}
```

As you can see when we create a module we dont have any way to add routes on it. Below is an example of implementation of how to add a `RouterModule` for this module to add routes.

```ts
import { UsersController, UsersIdController } from "./controller";
import { RouterModule } from "@mayajs/router";
import { UsersServices } from "./services";

// Define the routes
const routes = [
  {
    path: "/",
    controller: UsersController,
  },
  {
    path: ":id",
    controller: UsersIdController,
  },
];

export class UsersModule extends MayaJsModule {
  // User `RouterModule.forRoot` to inject the routes
  imports = [RouterModule.forRoot(routes)];
  // Declare the controllers that will be used inside the routes
  declarations = [UsersIdController, UsersController];
}
```

## CUSTOM MODULE

Unlike the common mayajs module, custom modules provide other functionality aside from managing your controllers. One example of this the `RouterModule` that is reponsible for adding routes to your module. A key concept of a custom module is it has an `invoke` and `forRoot` function that provides additional functionalities.

```ts
export class UsersModule extends CustomModule {
  invoke() {
    // This function will run after an instance of this module is created
    // But the providers will stay singleton on each instance
  }

  static forRoot(options: any) {
    return {
      module: UsersModule, // Returns the current module reference
      providers: [], // List of providers that this module will use on its controllers
    };
  }
}
```

Now we know how to create a module but how we can call it on our routes. We are now introducing to `loadChildren` property of our route object. MayaJs will automatically resolve the module asynchronously when the path is added on the route list.

```ts
import maya from "@mayajs/router";
import http from "http";

const app = maya();

app.add([
  {
    path: "users",
    // We are using dynamic importing so we don't need it to manually import the module in the file
    // MayaJs will resolve the module asynchronously
    loadChildren: () => import("./users.module").then((m) => m.UsersModule),
  },
]);
```

## Collaborating

See collaborating guides [here.](https://github.com/mayajs/maya/edit/master/COLLABORATOR_GUIDE.md)

## People

Author and maintainer [Mac Ignacio](https://github.com/macign)

## License

[MIT](https://github.com/mayajs/router/blob/develop/LICENSE)
