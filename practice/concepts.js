// 1
function createUser(name, favoriteNumber) {
  //   if (!name || !favoriteNumber) return; // provides undefined as output
  if (name == null || favoriteNumber == null) return; // correct

  return {
    id: Math.random(),
    name,
    favoriteNumber,
  };
}
// console.log(createUser("Naufal", 0));

// 2
// -------Optional Chaining and Nullish Coalscing-------------------

//This question tests your understanding of default parameters,
// destructuring, and how to handle optional parameters in JavaScript.
// It also reveals whether you know modern JavaScript features like optional chaining and nullish coalescing.

//  X
function printUser(user, options) {
  if (options.showName) {
    console.log(user.name);
  }

  if (options.showAge) {
    console.log(user.age);
  }
}

//  Correct
// optional chaining
// ?. is the optional chaining operator, which allows you to safely access deeply nested properties without having to check each level for existence. If any part of the chain is null or undefined, the expression short-circuits and returns undefined instead of throwing an error.

function printUser(user, options) {
  if (options?.showName) {
    console.log(user.name);
  }
  if (options?.showAge) {
    console.log(user.age);
  }
}

//  define default function parameters:
function printUser(user, { showName = false, showAge = false } = {}) {
  if (showName) {
    console.log(user.name);
  }
  if (showAge) {
    console.log(user.age);
  }
}

// 3

const user = [
  { name: "Thomas", age: 10 },
  { name: "Kyle", age: 30 },
];

function userAgeCheck(user) {
  user.isAdult = user.Age > 18;
  return user;
}

const isAuldtUser = userAgeCheck(user[0]);
console.log(isAuldtUser.isAdult);
console.log(users[0]);
// Output: { name: 'Thomas', age: 10, isAdult: false } -> Original array data was changed!

// correct

// user spread operators
const users = [
  { name: "Kyle", age: 30 },
  { name: "Sarah", age: 25 },
];

function userAgeCheck(user) {
  return {
    ...user,
    isAdult: user.age > 18,
  };
}

const isAdultUser = userAgeCheck(users[0]);

console.log(isAdultUser.isAdult); // true
console.log(users[0]); // { name: 'Kyle', age: 30 } (original remains untouched!)

// MID LEVEL
// 1 - ASYNC/AWAIT AND PROMISES

// CORRECT
async function subscribeToUpdates(userId) {
  // 1. Wait for subscription action to finish first
  const subscription = await fetch(`api/api/subscribe/${userId}`, {
    method: "POST",
  });

  //2. Fetch preference snd notificationin parallel
  const [preferencesRes, notificationsRes] = await Promise.all([
    fetch(`/api/users/${userId}/preferences`),
    fetch(`/api/notifications/${userId}`),
  ]);

  // Parse responses if needed:
  // const preferences = await preferencesRes.json()
  // const notifications = await notificationsRes.json()
}

// 2.   DEBOUNCE

function debounce(fn, delay) {
  let timerId = null;

  return function (...args) {
    const context = this;
    if (timerId !== null) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      fn.apply(context, args);
      timerId = null; // clean up after extension
    }, delay);
  };
}

// correct 2
function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(func.bind(this, ...args), delay);
  };
}

// 3 memoization
function memoizeAsync(fn) {
  const cache = new Map();

  return async function (id) {
    if (cache.has(id)) return cache.get(id);

    const promise = await fn(id);
    cache.set(id, promise);

    try {
      const result = await promise;
      cache.set(id, result);
      return result;
    } catch (e) {
      cache.delete(id);
      throw e;
    }
  };
}
const getProductMemo = memoizeAsync(getProduct);
// The reason we cache the promise is so that even if the function is called multiple times before the first promise resolves, it will return the same promise. This prevents unnecessary duplicate requests and ensures that all calls receive the same result.

// Cache invalidation can be handled by:

// Time-based expiration (TTL)
// Manual cache clearing
// Event-based (e.g., when product data changes)

// SENIOR LEVEL

// 1. vIRTUAL DOM

// ------------rEFER TEH WEB SIMPLIFIED BLOG-------------
