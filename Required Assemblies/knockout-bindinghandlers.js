ko.bindingHandlers.showModal = {
    init: function (element, valueAccessor) {
        $(element).modal({
            show: false
        });

        var value = valueAccessor();
        if (typeof value === 'function') {
            $(element).on('hide.bs.modal', function () {
                value(false);
            });
        }
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $(element).modal("destroy");
        });
    },
    update: function (element, valueAccessor) {
        var value = valueAccessor();
        if (ko.utils.unwrapObservable(value)) {
            $(element).modal('show');
            $("input", element).focus();
        }
        else {
            $(element).modal('hide');
        }
    }
};

ko.bindingHandlers.currency = {
    init: function (element, valueAccessor) {

        ko.utils.registerEventHandler(element, "change", function () {
            var observable = valueAccessor();
            var value = $(element).val();
            var regexMatch = /^\$?\s*((\d+)(\.\d{0,2})?)$/.exec(value.replace(",", ""));
            if (regexMatch) {
                var parsedValue = parseFloat(/^\$?\s*((\d+)(\.\d{0,2})?)$/.exec(value.replace(",", ""))[1]);
                if (parsedValue !== null)
                    observable(parsedValue);
            } else {
                observable(null);
                observable.valueHasMutated();
            }

        });

    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        return ko.bindingHandlers.text.update(element, function () {
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value === null) {
                $(element).val('');
            } else if (value >= 0) {
                $(element).val('$' + parseFloat(value, 10).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString());
            } else {
                $(element).val('($' + Math.abs(parseFloat(value, 10)).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,").toString() + ')');
            }
        });
    }
};


ko.bindingHandlers.int = {
    init: function (element, valueAccessor) {

        ko.utils.registerEventHandler(element, "change", function () {
            var observable = valueAccessor();
            var value = $(element).val();

            var numvalue = Number(value);
            if (numvalue % 1 === 0) {
                observable(numvalue);
            } else {
                if (observable.valueHasMutated) {
                    observable(null);
                    observable.valueHasMutated();
                } else { // incase computed is being bound
                    $(element).val('');
                }
            }

        });

    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        return ko.bindingHandlers.text.update(element, function () {
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value === null) {
                $(element).val('');
            } else {
                $(element).val(value);
            } 
        });
    }
};


//
// http://stackoverflow.com/questions/7537002/how-to-create-an-auto-complete-combobox/7538860#7538860
//

//jqAuto -- main binding (should contain additional options to pass to autocomplete)
//jqAutoSource -- the array to populate with choices (needs to be an observableArray)
//jqAutoQuery -- function to return choices (if you need to return via AJAX)
//jqAutoValue -- where to write the selected value
//jqAutoSourceLabel -- the property that should be displayed in the possible choices
//jqAutoSourceInputValue -- the property that should be displayed in the input box
//jqAutoSourceValue -- the property to use for the value
ko.bindingHandlers.jqAuto = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
        var options = valueAccessor() || {},
            allBindings = allBindingsAccessor(),
            unwrap = ko.utils.unwrapObservable,
            modelValue = allBindings.jqAutoValue,
            source = allBindings.jqAutoSource,
            query = allBindings.jqAutoQuery,
            valueProp = allBindings.jqAutoSourceValue,
            inputValueProp = allBindings.jqAutoSourceInputValue || valueProp,
            labelProp = allBindings.jqAutoSourceLabel || inputValueProp;

        //function that is shared by both select and change event handlers
        function writeValueToModel(valueToWrite) {
            if (ko.isWriteableObservable(modelValue)) {
               modelValue(valueToWrite );  
            } else {  //write to non-observable
               if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers']['jqAutoValue'])
                        allBindings['_ko_property_writers']['jqAutoValue'](valueToWrite );    
            }
        }

        //on a selection write the proper value to the model
        options.select = function(event, ui) {
            writeValueToModel(ui.item ? ui.item.actualValue : null);
        };

        //on a change, make sure that it is a valid value or clear out the model value
        options.change = function(event, ui) {
            var currentValue = $(element).val();
            var matchingItem =  ko.utils.arrayFirst(unwrap(source), function(item) {
               return unwrap(item[inputValueProp]) === currentValue;  
            });

            //if (!matchingItem) {
            //   writeValueToModel(null);
            //}    
        }

        //hold the autocomplete current response
        var currentResponse = null;

        //handle the choices being updated in a DO, to decouple value updates from source (options) updates
        var mappedSource = ko.dependentObservable({
            read: function() {
                    mapped = ko.utils.arrayMap(unwrap(source), function(item) {
                        var result = {};
                        result.label = labelProp ? unwrap(item[labelProp]) : unwrap(item).toString();  //show in pop-up choices
                        result.value = inputValueProp ? unwrap(item[inputValueProp]) : unwrap(item).toString();  //show in input box
                        result.actualValue = valueProp ? unwrap(item[valueProp]) : item;  //store in model
                        return result;
                });
                return mapped;                
            },
            write: function(newValue) {
                source(newValue);  //update the source observableArray, so our mapped value (above) is correct
                if (currentResponse) {
                    currentResponse(mappedSource());
                }
            }
        });

        if (query) {
            options.source = function(request, response) {  
                currentResponse = response;
                query.call(this, request.term, mappedSource);
            }
        } else {
            //whenever the items that make up the source are updated, make sure that autocomplete knows it
            mappedSource.subscribe(function(newValue) {
               $(element).autocomplete("option", "source", newValue); 
            });

            options.source = mappedSource();
        }

        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $(element).autocomplete("destroy");
        });


        //initialize autocomplete
        $(element).autocomplete(options);
    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
       //update value based on a model change
       var allBindings = allBindingsAccessor(),
           unwrap = ko.utils.unwrapObservable,
           modelValue = unwrap(allBindings.jqAutoValue) || '', 
           valueProp = allBindings.jqAutoSourceValue,
           inputValueProp = allBindings.jqAutoSourceInputValue || valueProp;

       //if we are writing a different property to the input than we are writing to the model, then locate the object
       if (valueProp && inputValueProp !== valueProp) {
           var source = unwrap(allBindings.jqAutoSource) || [];
           var modelValue = ko.utils.arrayFirst(source, function(item) {
                 return unwrap(item[valueProp]) === modelValue;
           }) || {};             
       } 

       //update the element with the value that should be shown in the input
       $(element).val(modelValue && inputValueProp !== valueProp ? unwrap(modelValue[inputValueProp]) : modelValue.toString());    
    }
};


//
// https://github.com/thinkloop/knockout-js-infinite-scroll/blob/master/knockout-js-infinite-scroll.js
//
(function (factory) {
    // Module systems magic dance.

    /* istanbul ignore next - (code coverage ignore) */
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "knockout"
        factory(require("knockout"), exports);
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "knockout"
        define(["knockout", "exports"], factory);
    } else {
        // <script> tag: use the global `ko` object
        factory(ko, {});
    }
}(function (ko, exports) {
    ko.extenders.infinitescroll = function (target, args) {
        var props = {};

        target.infinitescroll = props;

        props.numPagesPadding = ko.observable(parseFloat(args.numPagesPadding) || 1);

        // dimensions
        props.viewportWidth = ko.observable(-1);
        props.viewportHeight = ko.observable(-1);

        props.itemWidth = ko.observable(-1);
        props.itemHeight = ko.observable(-1);

        props.scrollY = ko.observable(0);

        // if using the main browser scroller to scroll a container that is not 100% tall,
        // the gap between the scroller height and div height is the scrollYOffset in px.
        props.scrollYOffset = ko.observable(0);

        // calculations
        props.numColsPerPage = ko.computed(function () {
            var viewportWidth = parseInt(props.viewportWidth()),
				itemWidth = parseInt(props.itemWidth()) || -1;
            return Math.max(Math.floor(viewportWidth / itemWidth), 0);
        });
        props.numRowsPerPage = ko.computed(function () {
            var viewportHeight = parseInt(props.viewportHeight()),
				itemHeight = parseInt(props.itemHeight()) || -1;
            return Math.max(Math.ceil(viewportHeight / itemHeight), 0);
        });
        props.numItemsPerPage = ko.computed(function () {
            var numColsPerPage = parseInt(props.numColsPerPage()),
				numRowsPerPage = parseInt(props.numRowsPerPage());
            return numColsPerPage * numRowsPerPage;
        });
        props.numItemsPadding = ko.computed(function () {
            var numItemsPerPage = props.numItemsPerPage(),
				numPagesPadding = props.numPagesPadding(),
				numColsPerPage = props.numColsPerPage();
            return Math.max(Math.floor(numItemsPerPage * numPagesPadding / numColsPerPage) * numColsPerPage, 0);
        });
        props.firstVisibleIndex = ko.computed(function () {
            var scrollY = parseInt(props.scrollY()),
				scrollYOffset = parseInt(props.scrollYOffset()),
				itemHeight = parseInt(props.itemHeight()) || -1,
				numColsPerPage = props.numColsPerPage();
            return Math.max(Math.floor((scrollY - scrollYOffset) / itemHeight) * numColsPerPage, 0);
        });
        props.lastVisibleIndex = ko.computed(function () {
            return props.firstVisibleIndex() + props.numItemsPerPage() - 1;
        });
        props.firstHiddenIndex = ko.computed(function () {
            return Math.max(props.firstVisibleIndex() - 1 - props.numItemsPadding(), 0);
        });
        props.lastHiddenIndex = ko.computed(function () {
            return Math.min(props.lastVisibleIndex() + 1 + props.numItemsPadding(), target().length);
        });
        props.heightBefore = ko.computed(function () {
            return Math.max(props.firstHiddenIndex() / props.numColsPerPage() * props.itemHeight(), 0);
        });
        props.heightAfter = ko.computed(function () {
            return Math.max(((target().length - 1 - props.lastHiddenIndex()) / props.numColsPerPage()) * props.itemHeight(), 0);
        });

        // display items
        props.displayItems = ko.observableArray([]);
        ko.computed(function () {
            var oldDisplayItems = props.displayItems.peek(),
				newDisplayItems = target.slice(0, props.lastHiddenIndex());

            if (oldDisplayItems.length !== newDisplayItems.length) {
                props.displayItems(newDisplayItems);
                return;
            }

            // if collections are not identical, skip, replace with new items
            for (var i = newDisplayItems.length - 1; i >= 0; i--) {
                if (newDisplayItems[i] !== oldDisplayItems[i]) {
                    props.displayItems(newDisplayItems);
                    return;
                }
            }
        });
    };
}));

ko.bindingHandlers.currencyDisplay = {
    symbol: ko.observable('$'),
    update: function (element, valueAccessor, allBindingsAccessor) {
        return ko.bindingHandlers.text.update(element, function () {
            var value = +(ko.utils.unwrapObservable(valueAccessor()) || 0),
                symbol = ko.utils.unwrapObservable(allBindingsAccessor().symbol === undefined
                            ? allBindingsAccessor().symbol
                            : ko.bindingHandlers.currencyDisplay.symbol);
            return symbol + value.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, "$1,");
        });
    }
};