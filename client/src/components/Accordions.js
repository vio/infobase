import './Accordions.scss';
import { TransitionGroup, Transition } from 'react-transition-group';\
import { IconChevron } from '../icons/icons.js';
import { get_static_url } from '../request_utils.js';

function FirstChild(props) {
  const childrenArray = React.Children.toArray(props.children);
  return childrenArray[0] || null;
}

const defaultMaxHeight = "300px";
class AccordionEnterExit extends React.Component {
  constructor(){
    super();

    this.onExiting = this.onExiting.bind(this);
    this.onEntering = this.onEntering.bind(this);
  }
  onExiting(component){
    const node = ReactDOM.findDOMNode(component);
    const initialHeight = node.offsetHeight;

    d3.select(node)
      .style('opacity', 1 )
      .style('max-height', initialHeight+'px')
      .transition()
      .ease(d3.easeLinear)
      .duration(this.props.collapseDuration)
      .style('opacity', 1e-6 )
      .style('max-height', '1px');
  }
  onEntering(component){
    const node = ReactDOM.findDOMNode(component);

    d3.select(node)
      .style('max-height', "0px")
      .style('opacity', 1e-6)
      .transition()
      .ease(d3.easeLinear)
      .duration(this.props.expandDuration)
      .style( 'max-height', this.props.maxHeight || defaultMaxHeight )
      .style('opacity', '1')
      .on('end',function(){
        d3.select(node).style('max-height', 'none');
      });
  }
  render(){
    const {
      expandDuration,
      collapseDuration,
      onExited,
      enter,
      exit,
      in: in_prop,

      className,
      style,
      children,
    } = this.props;

    return (
      <Transition
        {...{
          timeout: { enter: expandDuration, exit: collapseDuration },
          onExited,
          enter,
          exit,
          in: in_prop,
        }}
        onEntering={this.onEntering}
        onExiting={this.onExiting}
      >
        <div 
          className={className}
          style={style}
        >
          {children}
        </div>
      </Transition>
    );
  }
}


const StatelessPullDownAccordion = ({ title, isExpanded, children, onToggle }) => (
  <div className="pull-down-accordion">
    <div className="pull-down-accordion-header" onClick={onToggle}>
      { title }
    </div> 
    <TransitionGroup component={FirstChild}>
      { isExpanded &&
        <AccordionEnterExit
          className="pull-down-accordion-body"
          style={{paddingTop: "5px"}}
          expandDuration={600}
          collapseDuration={600}
        >
          {children}
        </AccordionEnterExit>
      }
    </TransitionGroup>
    <div className="pull-down-accordion-footer" onClick={onToggle}>
      <button 
        className="pull-down-accordion-expander"
        aria-label={isExpanded ? "collapse above" : "expand above"}
      >
        <span>
          <IconChevron
            title="chevron"
            transform={isExpanded ? 'rotate(180)' : 'rotate(0)'}
          />
          {/* <img 
            src={get_static_url("svg/chevron.svg")} 
            style={{ 
              width: "20px", 
              height: "20px",
              transform: isExpanded ? 'rotate(180deg)' : 'none',
            }} 
          /> */}
        </span>
      </button>
    </div> 
  </div>
);


class AutoAccordion extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      isExpanded: props.isInitiallyExpanded,
    };
  }
  render(){
    const { isExpanded } = this.state;
    return React.createElement(
      StatelessPullDownAccordion,
      { ...this.props, 
        isExpanded,
        onToggle: ()=> this.setState({ isExpanded: !isExpanded }),
      }
    );
  }
}

export {
  FirstChild,
  AccordionEnterExit,
  StatelessPullDownAccordion,
  AutoAccordion,
};