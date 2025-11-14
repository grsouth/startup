# Notes

---

## HTML – structure & semantics

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My App</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <header>
      <h1>My Site</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    </header>

    <main>
      <section>
        <h2>Welcome</h2>
        <p>This is a paragraph with a <a href="#">link</a>.</p>
      </section>

      <form id="login" method="post">
        <label>Username <input name="user" required /></label>
        <label>Password <input type="password" name="pass" required /></label>
        <button>Login</button>
      </form>
    </main>

    <footer>&copy; 2025</footer>
  </body>
</html>
```

**Notes:**

* Always `<!doctype html>` and `<meta viewport>`.
* Use `header`, `nav`, `main`, `section`, `footer` semantically.
* Inputs: use correct `type` and `required` for validation.

---

## Service & Auth

* Sessions with Express cookies: set `httpOnly`, `sameSite: 'lax'`, and toggle `secure` in production.
* Hash passwords with `bcryptjs` (`genSalt` + `hash`) and compare with `compare`.
* Keep auth middleware tiny: look up `sid`, hydrate `req.user`, and short-circuit 401 when invalid.

```js
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const user = await authenticateUser(req.body);
    const sid = createSession(user.id);
    applySessionCookie(res, sid);
    res.json(buildEnvelope(user));
  } catch (error) {
    next(error);
  }
});
```

* Store per-user collections in maps keyed by user id so swapping to a database later is trivial.
* Always return JSON envelopes (`{ data, error }`) to keep frontend error handling consistent.
* Frontend fetch helper should `credentials: 'include'` to carry the auth cookie.

---

## CSS – layout, flex, grid, responsiveness

```css
/* Reset */
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui; }
img, video { max-width: 100%; display: block; }

/* Flexbox */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

/* Grid */
.cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

/* Responsive */
@media (width >= 48rem) {
  body { font-size: 1.125rem; }
}

/* Simple animation */
.fadein { animation: fade 1s ease-in; }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
```

**Notes:**

* Flex → 1D, Grid → 2D.
* Use `gap` for spacing, `clamp()` for fluid text.
* Media queries: `@media (width >= 600px)` for breakpoints.

---

## JavaScript – basics & DOM

```js
'use strict';
console.log('Hello');

// Variables
const PI = 3.14; let score = 0;

// Functions
function double(x) { return x * 2; }
const square = (x) => x * x;

// Arrays & objects
const arr = [1,2,3];
arr.forEach(n => console.log(n));
const user = { name: 'Ada', age: 32 };
console.log(user.name);

// Destructuring
const { name } = user;
const [a,b] = arr;

// DOM
const btn = document.querySelector('button');
btn.addEventListener('click', () => alert('Clicked!'));
```

**Notes:**

* Prefer `const`, avoid `var`.
* Arrow funcs inherit `this`.
* `document.querySelector` selects; `addEventListener` binds.

---

## Browser API – JSON, LocalStorage, Time

```js
// JSON
const obj = { a:1 };
localStorage.setItem('data', JSON.stringify(obj));
const parsed = JSON.parse(localStorage.getItem('data'));

// Time + interval
setInterval(() => console.log(new Date().toLocaleTimeString()), 1000);
```

**Notes:**

* LocalStorage only stores strings → wrap in JSON.
* `setInterval` repeats; `setTimeout` delays once.

---

## JavaScript – functions, arrays, classes

```js
// Higher-order array funcs
const nums = [1,2,3,4];
const evens = nums.filter(n => n % 2 === 0);
const squares = nums.map(n => n*n);
const total = nums.reduce((a,n) => a + n, 0);

// Class
class Counter {
  constructor(start=0){ this.n=start; }
  inc(){ this.n++; }
}
const c = new Counter();
c.inc();
```

---

## Promises & async/await

```js
// Promise
fetch('/api/data')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Async/await
async function load() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('Bad status');
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
```

**Notes:**

* `.then()` chains; `await` is cleaner.
* Always handle bad responses with `!res.ok`.

---

## React – components, props, state

```jsx
// Basic component
export default function App() {
  return (
    <main>
      <h1>Hello React</h1>
      <Counter start={5} />
    </main>
  );
}

function Counter({ start }) {
  const [n, setN] = React.useState(start);
  return (
    <>
      <p>{n}</p>
      <button onClick={() => setN(n + 1)}>+</button>
    </>
  );
}
```

**Notes:**

* Props are readonly.
* State triggers re-render.

### Hooks

```jsx
const [count, setCount] = React.useState(0);
React.useEffect(() => {
  console.log('Mounted');
  return () => console.log('Unmounted');
}, []);
```

* Empty deps → run once.

---

## React Router (v6)

```jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Notes:**

* `Routes` wraps `Route`s; use `Link` for nav.
* `useNavigate` and `useParams` inside pages.

---

## Debugging & Console

```js
console.log({ data });
console.table(list);
console.time('x');
console.timeEnd('x');
debugger; // breaks in DevTools
```

---

## Mongo + Auth Persistence

- Use a single `MongoClient` in `service/db.js` and wait for `initDatabase()` before starting Express so the API never handles requests without a database.
- Store UUIDs as `_id` so we can keep returning `id` strings to the frontend while still benefiting from Mongo indexes (`users.username`, `sessions.updatedAt`, etc.).
- Convert the auth/session middleware to async/await. When a session cookie shows up we call `touchSessionRecord` and `findUserById`, so a deleted user automatically invalidates their sessions.
- Each CRUD route now scopes queries by `userId`, which makes it trivial to filter on the server instead of trusting the client.
