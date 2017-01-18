# adapt-contrib-hotgraphic-audio  

**Hot Graphic** is a *presentation component* bundled with the [Adapt framework](https://github.com/adaptlearning/adapt_framework).  
<img src="https://github.com/adaptlearning/documentation/blob/master/04_wiki_assets/plug-ins/images/hotgraphic01.gif" alt="Hot Graphic in action">  

When a learner clicks on a hot spot within the image, a pop-up is displayed that consists of text with an image. [Visit the **Hot Graphic** wiki](https://github.com/adaptlearning/adapt-contrib-hotgraphic/wiki) for more information about its functionality and for explanations of key properties.


##Installation

Matching audio must be installed manually.


## Settings Overview

The attributes listed below are used in *components.json* to configure **Hot Graphic**, and are properly formatted as JSON in [*example.json*](https://github.com/adaptlearning/adapt-contrib-hotgraphic-audio/blob/master/example.json).

### Attributes

[**core model attributes**](https://github.com/adaptlearning/adapt_framework/wiki/Core-model-attributes): These are inherited by every Adapt component. [Read more](https://github.com/adaptlearning/adapt_framework/wiki/Core-model-attributes).

**_component** (string): This value must be: `hotgraphic`. (One word.)

**_classes** (string): CSS class name to be applied to **Hot Graphic**’s containing `div`. The class must be predefined in one of the Less files. Separate multiple classes with a space.

**_layout** (string): This defines the horizontal position of the component in the block. Acceptable values are `full`, `left` or `right`.  

**instruction** (string): This optional text appears above the component. It is frequently used to
guide the learner’s interaction with the component.  

**mobileBody** (string): This is optional text that will be substituted for **body** when `Adapt.device.screenSize` is `small` (i.e., when viewed on mobile devices).  

**mobileInstruction** (string): This is optional text that will be substituted for **instruction** when `Adapt.device.screenSize` is `small` (i.e., when viewed on mobile devices).  

**_setCompletionOn** (string): This value determines when the component registers as complete. Acceptable values are `"allItems"` and `"inview"`. `"allItems"` requires each pop-up item to be visited. `"inview"` requires the **Hot Graphic** component to enter the view port completely.  

**_canCycleThroughPagination** (boolean): Enables the pop-ups to be cycled through endlessly using either the previous or next icon. When set to `true`, clicking "next" on the final stage will display the very first stage. When set to `false`, the final stage will display only a "previous" icon. The default is `false`.  

**_hidePagination** (boolean): When set to `true`, hides the "previous" and "next" icons and progress indicator (e.g., "1/5") on the pop-up's toolbar. The default is `false`.  

**_graphic** (string): The main image that appears below the hot spots. It contains values for **src**, **alt** and **title**.

>**src** (string): File name (including path) of the image. Path should be relative to the *src* folder (e.g., *course/en/images/origami-menu-two.jpg*).

>**alt** (string): This text becomes the image’s `alt` attribute.

>**title** (string): This text becomes the image’s `title` attribute.  

**_items** (string): Multiple items may be created. Each item represents one hot spot for this component and contains values for **title**, **body** and **_graphic**.

>**title** (string): This is the title text for a hot spot pop-up.

>**body** (string): This is the main text for a hot spot pop-up.

>**_graphic** (string): The image that appears as a hot spot. Its location is controlled by **_top** and **_left**. It contains values for **src** and **alt**.  

>>**src** (string): File name (including path) of the image. Path should be relative to the *src* folder (e.g., *course/en/images/origami-menu-two.jpg*).

>>**alt** (string): This text becomes the image’s `alt` attribute.   

>**strapline** (string): This text is displayed when `Adapt.device.screenSize` is `small` (i.e., when viewed on mobile devices). It is presented in a title bar above the image.

>**_top** (number): Each hot spot must contain **_top** and **_left** coordinates to position them on the hot graphic. Enter the number of pixels this hot spot should be from the top border of the main graphic.

>**_left** (number): Enter the number of pixels this hot spot should be from the left border of the main graphic.  

### Accessibility
**Hot Graphic** has two elements assigned a label using the [aria-label](https://github.com/adaptlearning/adapt_framework/wiki/Aria-Labels) attribute: **ariaRegion** and **ariaPoupupLabel**. These labels are not visible elements. They are utilized by assistive technology such as screen readers. Should the label texts need to be customised, they can be found within the **globals** object in [*properties.schema*](https://github.com/adaptlearning/adapt-contrib-hotgraphic-audio/blob/master/properties.schema).   
<div float align=right><a href="#top">Back to Top</a></div>

## Limitations

When viewport size changes to the smallest range, this component will behave like a [**Narrative** component](https://github.com/adaptlearning/adapt-contrib-narrative). All information will remain available but formatted as a narrative rather than as hot spots on a graphic.  


----------------------------
**Version number:**  2.0.19    
**Framework versions:**  ^2.0.4     
**Author / maintainer:** Deltanet, forked from [Adapt Core](https://github.com/adaptlearning/adapt-contrib-hotgraphic/)
