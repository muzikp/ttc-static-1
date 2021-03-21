/*global $*/

$(document).ready(function(){
    numeral.register('locale', 'cz', {
        delimiters: {
            thousands: '.',
            decimal: ','
        },
        abbreviations: {
            thousand: 'tis.',
            million: 'mil.',
            billion: 'mld.',
            trillion: '.tln'
        },
        ordinal : function (number) {
            return "."
        },
        currency: {
            symbol: 'Kč'
        }});
    numeral.locale('cz');
    $(document).find("[data-toggle='tooltip']").tooltip();
    //creates a new product box
    $(".product-menu-item").click(function(){createProductBox($(this).attr("data-create-new"));})
    //make a copy of an object
    $(document).on("click", ".btn-product-basket-copy", function(){createProductBox($(this).closest(".product-box"));});
    //creates a new product object or make a copy
    // templateBox {string} => creates a new box from a prototype
    // templateBox {object; an existing box} => creates a copy
    function createProductBox(templateBox)
    {
        var newId = rnd();
        var oldId = typeof templateBox == "object" ? templateBox.attr("id") : null;
        var newProduct = typeof templateBox == "string" ? $(`[data-prototype][data-product-id = "${templateBox}"]`).clone().attr("id", newId).removeAttr("data-prototype") : templateBox.clone().attr("id", newId).removeAttr("data-prototype");
        var newSummaryItem = typeof templateBox == "string" ? $(".summary-item[data-prototype]").clone().attr("product-box-source-id", newId).removeAttr("hidden").removeAttr("data-prototype") : $(`.summary-item[product-box-source-id="${oldId}"]`).clone().attr("product-box-source-id", newId).removeAttr("hidden").removeAttr("data-prototype");
        newSummaryItem.find(".type").text(`${$(newProduct).attr("data-basket-title")}`);
        //init control effects for each data-affect-targets control in the box
        newProduct.find("[data-affect-targets]").each(function(){initControlChangeEffects($(this))});
        $(".basket").append(newProduct);
        $("#basket-items").append(newSummaryItem);
        newProduct.find("[data-toggle='tooltip']").tooltip();
        newSummaryItem.find("[data-toggle='tooltip']").tooltip();
    }
    //validates box output and alerts JSON
    $(document).on("click", ".btn-product-basket-json", function(){
        var json = $(this).closest(".product-box").collectProductBoxData(false)
        if(json) alert(JSON.stringify(json, null, "\t"));
    });
    //valides box data
    $(document).on("click", ".btn-product-basket-validate", function(){
        var json = $(this).closest(".product-box").collectProductBoxData(true)
        if(json) $(this).notify("V pořádku", "success");
    });
    //delete an item from basket
    $(document).on("click", ".btn-product-basket-delete", function(){
        var pbId = $(this).closest(".product-box").attr("id");
        $(`#${pbId}`).remove();
        $(`[product-box-source-id="${pbId}"]`).remove();
    });
    //collect single product box input data
    $.fn.collectProductBoxData = function(production){
        var d= {};
        var error = false;
        $(this).find("[data-target]").not(":disabled").each(function(){
            var key = $(this).attr("data-target");
            var value = $(this).attr("type") == "checkbox" ? $(this).prop("checked"): $(this).val();
            if($(this).hasAttr("data-required") && !$(this).prop("disabled") && production && value.toString().length === 0){
                $(this).notify("Musíte vyplnit hodnotu", "error");
                error = true;
            }
            d[key] = value;
        });
        return error ? !error : d;
    };
    //triggers calculation whenever an input value changes
    $(document).on("change", "[data-target]", function(){
        var pb = $(this).closest(".product-box");        
        $(`[product-box-source-id="${pb.attr("id")}"]`).find(".title").text(pb.find("[data-target='userDefinedTitle']").val());            
        var d = pb.calculateProductBox(); 
        pb.displayProductBoxPrice(d);
    });
    //displays the calculation result in the price element of the parental product-box
    $.fn.displayProductBoxPrice = function(result){
        if(result.error)
        {
            $(this).find(".resume").find(".alert").attr("hidden", false).text(result.error);  
            $(this).find(".resume").find(".price").attr("hidden", true);
            $(`[product-box-source-id="${$(this).attr("id")}"]`).find(".alert").attr("hidden", false);
            $(`[product-box-source-id="${$(this).attr("id")}"]`).find(".price").text(result.value).attr("data-net-price", 0).attr("data-gross-price", 0).attr("data-price-index", 0).attr("hidden", true);
        }
        else
        {
            // pi = priceIndex, gp = gross price, np = net price
            var pi = (100 + Number(result.priceIndex || 0))/100;
            var gp = result.value || 0;
            var $gp = numeral(gp).format("0,0") + ",- Kč";
            var np = gp * pi;
            var $np = numeral(np).format("0,0") + ",- Kč";
            var $resume_html = pi < 1 ? `<p class="gross-price">${$gp}<p><p class="discount">${numeral(pi-1).format("0 %")}</p><b>${$np}</b>` : $np; 
            //console.dir($resume_html);
            $(this).find(".resume").find(".price").attr("hidden", false).html($resume_html);
            $(this).find(".resume").find(".alert").attr("hidden", true);
            $(`[product-box-source-id="${$(this).attr("id")}"]`).find(".alert").attr("hidden", true);
            $(`[product-box-source-id="${$(this).attr("id")}"]`).find(".price").attr("hidden", false).html($resume_html).attr("data-net-price", np).attr("data-gross-price", gp).attr("data-price-index", pi - 1);
            if(result.info)  $(`[product-box-source-id="${$(this).attr("id")}"]`).find(".title").html(result.info);
            
        }
        var totalGross = 0;
        var totalNet = 0
        $("[data-gross-price]").each(function(){totalGross += Number($(this).attr("data-gross-price"));})
        $("[data-net-price]").each(function(){totalNet += Number($(this).attr("data-net-price"));});
        var $all_html = totalGross > totalNet ? `<p class="gross-price">${numeral(totalGross).format("0,0") + ",- Kč"}<p><p class="discount">${numeral(totalNet/totalGross -1).format("0 %")}</p><b>${numeral(totalNet).format("0,0[.]00") + ",- Kč"}</b>` : numeral(totalNet).format("0,0'") + ",- Kč";
        $("#basket-total-value").html($all_html);
    };
    //afects controls inside the box form by the data-affect-targets
    //all events: click change ready keyup keydown
    $(document).on("change ready", "[data-affect-targets]", function(){
        initControlChangeEffects($(this));
    });
    // ---> main function
    function initControlChangeEffects(e)
    {
        if(e.hasAttr("data-affect-targets")){
            console.log("Init control effects");
            // dt = config for key/value pair of conditions and affected controls
            var dt = JSON.parse(e.attr("data-affect-targets") || '[]');
            var pb = e.closest(".product-box");
            //enables all data-target controls before disabling specified
            pb.find("[data-target]").each(function(){$(this).removeAttr("disabled")});
            //loops through each control tagged 'data--target' except userDefinedTitle
            var selectedValue = $(e).val();
            //effect for the selected value => REWRITE THE COMPARISON
            var c = dt.find(function(i){return i.condition.toString() == selectedValue.toString()});
            (c ? !c.disables ? [] : c.disables : []).forEach(function(_dt){
                pb.find(`[data-target="${_dt}"]`).attr("disabled", true);
            });
            (c ? !c.enables ? [] : c.enables : []).forEach(function(_dt){
                pb.find(`[data-target="${_dt}"]`).removeAttr("disabled");
            });
        }
    }
    $.fn.calculateProductBox = function(){
        var productId = $(this).attr("data-product-id");
        switch (productId) {
            case "testing":
                return calculateProductBox_testing($(this).collectProductBoxData(false));
                break;
            case "experiential-testing":
                return calculateProductBox_experientialTesting($(this).collectProductBoxData(false));
                break;
            case "sampling":
                return;
                break;        
            case "logistics":
                return calculateProductBox_logistics($(this).collectProductBoxData(false));
                break;
            case "translation":
                return calculateProductBox_translation($(this).collectProductBoxData(false));
                break;
            case "plugin":
                return calculateProductBox_plugin($(this).collectProductBoxData(false));
            default:
                break;
        }
    }

    function calculateProductBox_experientialTesting(data){
        if(Number(data.totalOfTestings < 0)) return {error: "Minimální počet testování je 0."};
        if(Number(data.totalOfTesters < 0)) return {error: "Minimální počet testerů je 0."};
        if(Number(data.targetGroupProb <= 0)) return {error: "Procento cílové skupiny testerů v populaci musí být větší než nula a menší nebo rovno 100."};
        var priceIndex =  1 / Math.pow(Number(data.targetGroupProb)/100, 0.5)
        var pricePerTestersPerOneTesting = 500 * priceIndex * Number(data.totalOfTesters);
        var pricePerOneTestingTimeAndModerator = Number(data.lengthOfTesting)*(data.ownModerator ? 0 : 2000) + 4000; //2000 = moderator hour cost, 4000 = refreshment, rent
        var total = Number(data.totalOfTestings)*(pricePerOneTestingTimeAndModerator + pricePerTestersPerOneTesting);
        /*
        console.log(pricePerTestersPerOneTesting);
        console.log(pricePerOneTestingTimeAndModerator);
        console.log("Total: " + total);
        */
        return {
            info: `Testování celkem: ${data.totalOfTestings}, počet testerů na jedno testování: ${data.totalOfTesters}, délka jednoho testování v hodinách: ${data.lengthOfTesting}, vlastní moderátor: ${data.ownModerator ? "ano" : "ne"}.`,
            value: Number(data.totalOfTestings)*(pricePerOneTestingTimeAndModerator + pricePerTestersPerOneTesting)
        }
    }

    function calculateProductBox_plugin(data){
        var result = {priceIndex: data.priceIndex};
        var cl = Number(data.contractLength)
        console.log(cl);
        if(cl < 1) return {error: "Délka závazku musí být mininálně 1 měsíců"};
        else if (cl < 12) result.value = cl * 1490;
        else result.value = 14900 + (cl - 12)*(14900/12);
        result.info = "Testovací plugin, počet měsíců úvazku: " + cl;
        return result;
    }
    function calculateProductBox_testing(data){
        if(!data) return {error: "Nejsou žádná data"};
        var result = Number(data.totalOfProducts || 0) * 5000;
        console.log("Testing: " + result);
        return {
            value: result,
            error: null
        };
        function getCommunityPricing()
        {

        }
    }
    function calculateProductBox_logistics(data){        
        if(!data) return false;
        //console.log(Number(data.provider));
        switch (Number(data.provider)) {
            case 1:
                var pplUnit = getPPLUnitPrice(data);
                if(pplUnit.value) pplUnit.value = pplUnit.value * data.totalOfParcels;
                pplUnit.info = `Doprava prostřednictvím PPL, počet balíků : ${data.totalOfParcels}, váha 1 balíku: ${data.parcelWeight} kg.`
                return pplUnit
                break;
            case 3:
                var zasilkovnaDepoCrUnit = getZasilkovnaDepoCzUnitPrice(data);
                if(zasilkovnaDepoCrUnit.value) zasilkovnaDepoCrUnit.value *= data.totalOfParcels;
                zasilkovnaDepoCrUnit.info = `Doprava prostřednictvím služby Zásilkovna, podání na depu v ČR, počet balíků : ${data.totalOfParcels}, váha 1 balíku: ${data.parcelWeight} kg.`
                return zasilkovnaDepoCrUnit
                break;
            case 99:
                return {value: 0, priceIndex: data.priceIndex, info: "Distribuce prostřednictvím vlastního dodavatele a na vlastní náklady klienta."};
                break;
            default:
                break;
        }
        function getZasilkovnaDepoCzUnitPrice(d)
        {
            var w = Number(d.parcelWeight);
            var px = Number(d.parcelX);
            var py = Number(d.parcelY);
            var pz = Number(d.parcelZ);
            //console.log(`${px} / ${py} / ${pz}`)
            if(w <= 5)
            {
                if((px+py+pz) > 120) return {error: "Součet všech stran balíku do 5kg musí být menší bež 120 cm."};
                else return {priceIndex: data.priceIndex, value: 43};
            }
            else if(w <= 10)
            {
                if((px+py+pz) > 150) return {error: "Součet všech stran balíku do 10kg musí být menší bež 150 cm."};
                else return {priceIndex: data.priceIndex, value: 128};
            }
            else
            {
                if((px+py+pz) > 150) return {error: "Součet všech stran balíku nad 10kg musí být menší bež 150 cm."};
                else return {priceIndex: data.priceIndex, value: 250};
            }

        }
        function getPPLUnitPrice(d)
        {
            var w = Number(d.parcelWeight);
            if(w > 31.5) return {
                error: "Přes PPL nelze odesílat zásilky těžší než 31,5 kg."
            }
            var r = w <= 2 ? 100 : w <=5 ? 116 : w <=10 ? 162 : w <= 20 ? 196 : w <= 31.5 ? 252 : 10000;
            return {priceIndex: data.priceIndex, value: r}
        }
    }
    function calculateProductBox_translation(data){
        switch (data.targetLanguage) {
            case "en":
                var defaultLength = 200;
                var defaultPrice = 400;
                var addPrice = {
                    unit: 100, //N of chars
                    value: 150 //price per N of chars
                }
                return {info: `Překlad recenzí do angličtiny, celkem recenzí: ${data.totalOfReviews}, průměrná délka recenze: ${data.averageTotalChars}, právní kontrola: ${data.lawCheck ? "ano" : "ne"}.`, priceIndex: data.priceIndex, value: (defaultPrice + (defaultLength - Number(data.averageTotalChars) < 0 ? Math.ceil((Number(data.averageTotalChars) - defaultLength)/addPrice.unit) * addPrice.value : 0) + (data.lawCheck ? 500 : 0))*Number(data.totalOfReviews)}
                break;
            case "sk":
                var defaultLength = 200;
                var defaultPrice = 320;
                var addPrice = {
                    unit: 100, //N of chars
                    value: 80 //price per N of chars
                }
                return {info: `Překlad recenzí do slovenštiny, celkem recenzí: ${data.totalOfReviews}, průměrná délka recenze: ${data.averageTotalChars}, právní kontrola: ${data.lawCheck ? "ano" : "ne"}.`, priceIndex: data.priceIndex, value: (defaultPrice + (defaultLength - Number(data.averageTotalChars) < 0 ? Math.ceil((Number(data.averageTotalChars) - defaultLength)/addPrice.unit) * addPrice.value : 0) + (data.lawCheck ? 500 : 0))*Number(data.totalOfReviews)}
                break;
            case "hu":
                var defaultLength = 200;
                var defaultPrice = 450;
                var addPrice = {
                    unit: 100, //N of chars
                    value: 180 //price per N of chars
                }
                return {info: `Překlad recenzí do maďarštiny, celkem recenzí: ${data.totalOfReviews}, průměrná délka recenze: ${data.averageTotalChars}, právní kontrola: ${data.lawCheck ? "ano" : "ne"}.`, priceIndex: data.priceIndex, value: (defaultPrice + (defaultLength - Number(data.averageTotalChars) < 0 ? Math.ceil((Number(data.averageTotalChars) - defaultLength)/addPrice.unit) * addPrice.value : 0) + (data.lawCheck ? 500 : 0))*Number(data.totalOfReviews)}
                break;
            default:
                return {priceIndex: data.priceIndex,value: Math.random()*1000}
                break;
        }
    }

    function validateProductBox(pb){
        return pb.collectProductBoxData(true); 
    };
    $.fn.hasAttr = function(name) {return this.attr(name) !== undefined;};
    function rnd(length){return Math.random().toString(36).substring(7);}
});
