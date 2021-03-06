import { trivial_text_maker } from '../models/text.js';

// I think eslint is wrong here
/* disable-eslint react/jsx-no-danger-children */
const TextMaker = ({text_maker_func, text_key, el, args, template_str}) => {
  const tm_func = _.isFunction(text_maker_func) ? text_maker_func : trivial_text_maker;
  const html = tm_func(text_key,_.clone(args)); //must clone args because props are immutable, text-maker will mutate obj
  return React.createElement(
    el || 'span',
    { dangerouslySetInnerHTML: {__html: html} }
  );
};

//shorthand for the above
const TM = ({k, el, args, tmf}) => <TextMaker text_key={k} el={el} args={args} text_maker_func={tmf}/>;

export {
  TextMaker,
  TM,
};