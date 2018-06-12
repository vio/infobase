import classNames from 'classnames';
import './CardCenteredImage.scss';

import { TM } from './TextMaker.js';

const CardCenteredImage = ({
  img_src,
  title_key,
  text_key,
  link_key,
  link_href,
  text_args,
}) => (
  <div className="centered-img-card">
    <div className="centered-img-card__left-container">
      <div className="centered-img-card__left">
        <header className="centered-img-card__title">
          <TM k={title_key}/>
        </header>
        <div className="centered-img-card__text">
          <TM k={text_key} args={text_args} />
        </div>
      </div>
    </div>
    { img_src &&
      <div>
        <div className="centered-img-card__right">
          <a className="centered-img-card__img-link" href={link_href}>
            <img
              src={`${CDN_URL}/${img_src}`}
              className={classNames("centered-img-card__img")}
            />
          </a>
        </div>
        <div className="centered-img-card__bottom-right">
          <div className="centered-img-card__link">
            <a href={link_href}>
              <TM k={link_key}/>
            </a>
          </div>
        </div>
      </div>
    }
  </div>
)

export { CardCenteredImage }