var marked = require('marked');
// Set options
marked.setOptions({
    renderer: new marked.Renderer(),
    pedantic: false,
    gfm: true,
    tables: true,
    breaks: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    xhtml: false
  });
module.exports.toHtml = (markdownStr) => {
    return marked(markdownStr);
};
