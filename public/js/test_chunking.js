const items = [
    { type: 'category', name: 'c', children: [] },
    { type: 'page_break' },
    { type: 'category', name: 'cc', children: [] }
];

function renderGenericStep(items) {
    const pages = [];
    let currentPage = [];

    items.forEach(item => {
        if (item.type === 'page_break' || item.type === 'page-break') {
            if (currentPage.length > 0) {
                pages.push(currentPage);
                currentPage = [];
            }
        } else {
            // emulate generic check
            if (item.name || item.basePrice || item.type) {
                currentPage.push(item);
            }
        }
    });
    if (currentPage.length > 0) {
        pages.push(currentPage);
    }

    return pages;
}

const result = renderGenericStep(items);
console.log('Pages:', result.length);
console.log('Page 0 Items:', result[0].map(i => i.name));
if (result[1]) {
    console.log('Page 1 Items:', result[1].map(i => i.name));
}
