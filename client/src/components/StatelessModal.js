import './StatelessModal.scss';

import { Modal } from 'react-bootstrap';

import { CountdownCircle } from './CountdownCircle.js';
import { trivial_text_maker } from '../models/text.js';

export class StatelessModal extends React.Component {
  constructor(props){
    super(props);

    this.auto_close_timeouts = [];
    this.onBlur = this.onBlur.bind(this);
    this.closeModal = this.closeModal.bind(this);
  }
  closeModal(){
    this.auto_close_timeouts.forEach( (auto_close_timeout) => clearTimeout(auto_close_timeout) );

    this.props.on_close_callback();
  }
  onBlur(e){
    const currentTarget = e.currentTarget;
    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement)) {
        this.closeModal();
      }
    }, 0);
  }
  componentWillUnmount(){
    this.closeModal();
  }
  componentDidUpdate(){
    const { auto_close_time } = this.props;

    if ( _.isNumber(auto_close_time) ){
      this.auto_close_timeouts.push( setTimeout(this.closeModal, auto_close_time) );
    }
  }
  render(){
    const {
      show,
      title,
      subtitle,
      body,
      close_text,
      auto_close_time,
    } = this.props;

    return (
      <Modal show={show} onHide={this.closeModal}>
        <div onBlur={this.onBlur}>
          <Modal.Header closeButton={!close_text}>
            {title && <Modal.Title style={{fontSize: '130%'}}>{title}</Modal.Title>}
            {subtitle && <Modal.Title style={{fontSize: '100%', marginTop: '7px'}}>{subtitle}</Modal.Title>}
          </Modal.Header>

          <Modal.Body>
            {body}
          </Modal.Body>
          
          <Modal.Footer
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
            }}
          >
            { auto_close_time && 
              <CountdownCircle time={auto_close_time} show_numbers={true} />
            }
            { close_text &&
              <button className="btn btn-ib-primary" onClick={this.closeModal}>
                {close_text}
              </button>
            }
          </Modal.Footer>
          <div tabIndex='0' onFocus={this.closeModal} />
        </div>
      </Modal>
    );
  }
}
StatelessModal.defaultProps = {
  auto_close_time: false,
  close_text: _.upperFirst( trivial_text_maker("close") ),
};