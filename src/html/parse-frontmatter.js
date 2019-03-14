const yaml = require('js-yaml');

/**
 * Given an mdast tree and it's text representation, this finds all
 * the frontmatter in it.
 *
 * Frontmatter looks like this:
 *
 * ```
 * ---
 * Foo: bar
 * ---
 * ```
 *
 * The frontmatter is delimited by a `thematicBreak` made from three
 * dashes in the mdast and contains a yaml-encoded payload.
 *
 * Not any yaml and any thematicBreak is accepted; in order to avoid
 * false positives, the following restrictions apply:
 *
 * - There must be the start or end of the document or an empty line (`\n\n`)
 *   before and after the frontmatter block
 * - There may be no empty line within the frontmatter block; not even lines
 *   containing only whitespace
 * - The yaml must yield an object (as in key-value pairs); strings, numbers or
 *   arrays are not considered to be frontmatter in this context
 * - The thematic break must be made up of three dashes
 *
 * Note that most of the information required to asses these properties
 * is not contained in the mdast itself, which is why this algorithm requires
 * access to the original markdown string.
 *
 * Note that converting the mdast to a markdown string will not do, since
 * the generated markdown will be much different.
 *
 * # Future directions
 *
 * This function is likely to change in the following ways:
 *
 * - Relaxed restrictions on what constitutes frontmatter.
 * - The ability to specify custom formats; by specifying the name
 *   of the format explicitly we reduce ambiguity to pretty much zero
 *   and can allow for far more complex frontmatter formats.
 *
 *    ```
 *    ---json
 *    {"foo": 42}
 *    ---
 *    ```
 *
 * # Ambiguous Frontmatter
 *
 * Normally, when one of the conditions above is triggered,
 * (e.g. Frontmatter containing an empty line; not being an array
 * instead of an object), a warning will be emitted instead of the
 * frontmatter being actually parsed & returned.
 * This warning may be processed by the caller in any way; e.g. by
 * printing a warning on the console or by throwing an error...
 *
 * In order to avoid ambiguous cases, the format described above
 * should be used for valid frontmatter; in order to use horizontal
 * rules unambiguously, the markdown author should either use symbols
 * other than dash to mark horizontal rules, or leave at least one empty
 * line before and after the three dashes.
 *
 * Both ways are guaranteed to be interpreted as horizontal rules and
 * never yield warnings.
 *
 * @param {Mdast} The object containing the mdast, including the root node and position information!
 * @param {Source} The original markdown
 * @returns {Iterable} Returns an iterable where each element represents either a
 *   block frontmatter or a warning issued.
 *   The order of warnings/frontmatter blocks is the same as in the input document.
 *
 *   Blocks of frontmatter use the following format:
 *
 *   ```
 *   {
 *     type: 'frontmatter',
 *     payload: {...},
 *     start: Number,
 *     end: Number
 *   }
 *   ```
 *
 *   `start` and `end` represent the index of the mdast `thematicBreak`
 *   node that starts/ends the frontmatter block.
 *   This can be used to quickly replace those sections in the input mdast.
 *
 *   Warnings use the following format:
 *
 *   ```
 *   {
 *     type: 'warning',
 *     warning: String,
 *     source: String, // Source code of the frontmatter block
 *     start: Number, // Node index as in 'frontmatter' type
 *     end: Number,
 *     cause: Error, // The error that caused the problem if any
 *   }
 *   ```
 */
const find_frontmatter = (mdast, src) => {
  // Access the md source of a markdown ast element
  const start = (idx) => mdast.childen[idx].position.start.offset;
  const end = (idx) => mdast.childen[idx].position.start.offset;
  const nodeStr = (idx) => src.slice(start(idx), end(idx));
  // Check if the previous/next ast element ends/starts with an empty line
  const afterEmpty = (idx) => idx === 0 || nodeStr(idx-1).match(/\n\s*\n$/);
  const beforeEmpty = (idx) => idx+1 === size(mdast) || nodeStr(idx+1).match(/^\n\s*\n/);

  // Preprocessing
  const blocks = pipe(
    enumerate(mdast.children)
    // Find any potential frontmatter starts/ends;
    filter(([idx, nod]) => nod.type === 'thematicBreak' && nodeStr(idx) === '---'),
    // Annotate the fences with whether they have an empty line
    // before/after
    map(([idx, nod]) => {
      idx, nod, after: afterEmpty(idx), before: beforeEmpty(idx)
    }),
    // Group the fences into actual pairs of start/end fence
    slidingWindow(2),
    // Get rid of pseudo frontmatter blocks that sliding window
    // implicitly inserts between the end of an actual frontmatter
    // block and the start of the next
    filter(([fst, last]) => fst.after && last.before),
  );

  const warn = (fst, last, txt, cause, prosa) => ({
    type: 'warning',
    warning: prosa,
    source: txt,
    start: fst,
    end: last
  });

  // Source code extraction, yaml parsing, checking constraints
  return map(blocks, ([fst, last]) => {
    const txt = src.slice(end(fst)+1, start(last)-1);
    if (txt.match(/\n\s*\n/)) {
      return warn(fst, last, txt, null,
          'Found ambigous frontmatter block: Block contains empty line! ' +
          'Make sure your frontmatter blocks contain no empty lines ' +
          'and your horizontal rules have an empty line before AND after them.'};
    }

    let data;
    try {
      data = yaml.safeLoad(txt);
    } catch (e) {
      return warn(fst, last, txt, e, `Exception ocurred while parsing yaml: ${e}`);
    }

    if (data.constructor !== Object) {
      return warn(fst, last, txt, null,
          'Found ambigous frontmatter block: Block contains valid yaml, but ' +
          `it's data type is ${data.constructor} instead of Object.` +
          'Make sure your yaml blocks contain only key-value pairs at the root level!');
    }

    return {
      type: 'frontmatter',
      payload: data,
      start: fst.idx,
      end: last.idx,
    };
  })
};

const parse_frontmatter = ({ content: { mdast } }) => {

  // We splice the mdast.
  let off = 0;

  for (const block in list(find_frontmatter(mdast))) {
    if (block.type === 'frontmatter') {
      // Replace all the ast nodes making up a frontmatter block
      // with the respective frontmatter block
      const cnt = block.end - block.start;
      mdast.children.splice(block.start + off, cnt, {
        type: 'yaml',
        payload: block.payload,
      });
      off -= cnt;

    } else {
      const {warning, source} = block;
      const fst = mdast.children[block.start];

      // Source file pretty printing with line numbers
      const sourceref = pipe(
        block.source.split('\n'),
        zipLeast2(range(fst.position.start.line, Infinity)),
        map(([line, no]) => `    ${no} | ${line} `),
        join(""));

      throw new Error(`${warning}\n${sourceref}`);
    }
  }

  return { content: { mdast } };
};

parse_frontmatter.find_frontmatter = find_frontmatter;
module.exports = parse_frontmatter;
