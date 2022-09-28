
## Very Long Introduction 🧙‍♂️

Have you ever wanted to build something that uses Chrome bookmarks but not release it as a Chrome extension? Have you ever wanted to programmatically alter the bookmarks in Chrome, or monitor these for additions, updates and deletions--again, without using extension APIs? 

There's a lot of libraries out there to parse Chrome bookmarks, but none that actually make it simple to modify them or monitor them for changes. Maybe you want to trigger a certain job like [archiving a web page](https://github.com/crisdosyago/DiskerNet) every time a bookmark is added--or something else? Just imagine! The 🌏 is your 🦪! 💎✨

Imagine you could do this, what would you build? Because what you couldn't do before, you now can. Actually...you probably could have done it, because it's *not that hard*.

Bookmate makes it possible to monitor and modify Chrome bookmarks, and have those changes propagated to sync--which means that the bookmarks and folders you insert on one device, will show up in Chrome on other devices where Chrome is logged into that same account. 

But cool your heels there a little bit, because there are a few major caveats that come with offering this functionality on the back of a flagship product of one of the internet-tycoon companies, one with major engineering chops and resources. Chrome has built a massive global infrastructure to sync data for their hundreds of millions of users, and something of this scale has to be reliable, and resilient against corruption. That prevents certain features from working with our current approach. 

So the following things are currently impossible with Bookmate, because we don't know a simple way to add the relevant sync-related metadata to ensure the following operations propagate:

- delete a bookmark. ✖️
- move a bookmark. ✖️
- rename a bookmark. ✖️

That sounds like everything you'd want to do!--right? Maybe so, maybe so. And if so, well I'm sorry, but you're flat of luck with Bookmate. 

But if you're use-case is different to that, if maybe it includes adding bookmarks, or reading bookmarks, or monitoring bookmarks for changes, well there's still plenty you can do. Have you ever wanted to, for instance:

- read a bookmark? ✔️
- read a bookmark folder? ✔️
- add a new bookmark? ✔️
- see if a bookmark exists? ✔️
- watch to see if any bookmarks are added, deleted or updated? ✔️

Well now you can do all those things! So, no stress friend--unfurrough that brow, it's gonna be OK 😄

The weird 🔦 thing about this...is that you are able to use Chrome bookmarks as a globally-synced single-tenant append-only key value multi-store, with the keys being valid URLs, and the values being the bookmark name text. Very interesting! Not that I am suggesting you do this, firstly, whether you are *not discouraged* from doing this or not is an unknown, but presumably the Sync team (if there is such a thing) would be unhappy with people using their infra for such purposes. But it certainly enables some interesting bookmark-related use cases. And if it were *not discouraged* it would most definitely enable some interesting use cases with respect to saving various forms of app data specific to a person or Profile, for various Chrome-related apps that existed outside of the Chrome Extensions WebStore and other places. 

