const pathStr = "C:\\Users\\David\\Downloads\\flowers.mov";
const normalized = pathStr.replace(/\\/g, "/");
const encoded = normalized.split('/').map(segment => encodeURIComponent(segment)).join('/');
const url = `lumin-file:///${encoded}`;
console.log(url);

const urlObj = new URL(url);
console.log(urlObj.pathname);
console.log(decodeURIComponent(urlObj.pathname));
