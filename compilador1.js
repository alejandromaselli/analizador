/* LÓGICA */
var arregloTokens = []

/* INTERFAZ */
//import {CodeJar} from 'https://medv.io/codejar/codejar.js'

let jar = CodeJar(document.querySelector('#texto'), Prism.highlightElement)
let jar2 = CodeJar(document.querySelector('#salida'), Prism.highlightElement)
jar.updateCode(``)
jar2.updateCode(``)

$("#aceptar").click(function () {
  respuesta = ``;
  error_parser = 0;
  error_semantico = 0;
  tablaReal = []
  $("#obtenerToken").prop('disabled', true);
  $("#parser").prop('disabled', true);
  $("#semantico").prop('disabled', true);
  jar2.updateCode(``)
  procesarRespuesta(jar.toString());
  mostrarTablaSimbolos();
});


$(document).ready(function () {
  $("#obtenerToken").prop('disabled', true);
  $("#parser").prop('disabled', true);
  $("#semantico").prop('disabled', true);
  mostrarTablaSimbolos();
});

$("#obtenerToken").click(function () {
  obtenerToken(arregloTokens);
});

$("#parser").click(function () {
  respuesta = ``;
  parser(arregloTokens);
  mostrarTablaSimbolos();
});

$("#semantico").click(function () {
  respuesta = ``;
  semantico(arregloTokens);
  mostrarTablaSimbolos();
});

document.getElementById('archivo')
  .addEventListener('change', leerArchivo, false);

function leerArchivo(e) {
  var archivo = e.target.files[0];
  if (!archivo) {
    return;
  }
  var lector = new FileReader();
  lector.onload = function (e) {
    var contenido = e.target.result;
    jar.updateCode(contenido)
  };
  lector.readAsText(archivo);
}

/* LÓGICA */

var numero_token = 0;
var error_parser = 0;
var error_semantico = 0;
var etapa = "";
var lineas = 0;
var respuesta = ``;
var ignorar = [" ", "\n", "	"];
var separar = ["(", ")", "{", "}", "+", "-", "*", "/", "<", ">", "<>", "&&", "||", ":=", ";"];
var Regla1 = [["Main", "ST"], ["(", "ST"], [")", "ST"], ["{", "ST"], ["2", "SNT"], ["2", "SNT"], ["6", "SNT"], ["}", "ST"]];
var Regla2 = [["Dim", "ST"], ["ID", "ST"], ["As", "ST"], ["P_T", "SNT"], [";", "ST"]];
var Regla3 = [["Integer", "ST"]];
var Regla4 = [["String", "ST"]];
var Regla5 = [["Decimal", "ST"]];
var Regla6 = [["If", "ST"], ["(", "ST"], ["7", "SNT"], [")", "ST"], ["Then", "ST"], ["{", "ST"], ["8", "SNT"], ["8", "SNT"], ["}", "ST"], ["Else", "ST"], ["{", "ST"], ["8", "SNT"], ["8", "SNT"], ["}", "ST"]];
var Regla7 = [["ID", "ST"], ["OP", "ST"], ["NU", "ST"]];
var Regla8 = [["ID", "ST"], [":=", "ST"], ["NU", "ST"], [";", "ST"]];


var tablaSimbolos = {
  "Main": "PR",
  "Dim": "PR",
  "As": "PR",
  "Integer": "PR",
  "Decimal": "PR",
  "String": "PR",
  "If": "PR",
  "Then": "PR",
  "Else": "PR",
  ";": "SP",
  "(": "SP",
  ")": "SP",
  ".": "SP",
  "{": "SP",
  "}": "SP",
  "+": "OP",
  "*": "OP",
  "-": "OP",
  "/": "OP",
  "<": "OP",
  ">": "OP",
  ":=": "OP",
  "=": "OP",
  "<>": "OP",
  "||": "OP",
  "&&": "OP"
}

var tablaReal = [];
var elementoTabla = {
  lexema: "",
  tipo_lexema: "",
  tipo: "",
  valor: "",
  accion: "",
  getElemento: function () {
    return [this.lexema, this.tipo_lexema, this.tipo, this.valor, this.accion];
  },
  setElemento: function (lexema, tipo_lexema, tipo, valor, accion) {
    this.lexema = lexema;
    this.tipo_lexema = tipo_lexema;
    this.tipo = tipo;
    this.valor = valor;
    this.accion = accion;
  }
}

function addElemento(elemento) {
  var coincidencia = false;
  if (tablaReal.length != 0) {
    for (var k in tablaReal) {
      if (tablaReal[k].lexema == elemento.lexema && tablaReal[k].tipo_lexema == elemento.tipo_lexema) {
        if (etapa != "lexico")
          tablaReal[k] = elemento;
        coincidencia = true;
      }
    }
    if (coincidencia == false)
      tablaReal.push(elemento)
  } else {
    tablaReal.push(elemento)
  }
}

function getTipo(lexema) {
  var tipo = tablaSimbolos[lexema]
  if (lexema.endsWith('"') && lexema.startsWith('"')) {
    return "ST"
  } else if (tipo === undefined) {
    var exprCadena = /[^A-Za-z0-9]+/g;
    var cadena = lexema.search(exprCadena) != -1
    if (cadena) {
      return "ERROR de identificador no aceptado"
    } else {
      return "ID"
    }
  } else {
    return tipo
  }
}

var token = {
  lexema: "",
  tipo: "",
  linea: 0,
  getToken: function () {
    return [this.lexema, this.tipo, this.linea];
  },
  setToken: function (lexema, linea) {
    if (lexema != "") {
      if (!isNaN(lexema)) {
        this.lexema = lexema;
        this.tipo = "NU";
        this.linea = linea;
      } else {
        this.lexema = lexema;
        this.tipo = getTipo(lexema);
        this.linea = linea;
      }
    }
  }
}

function procesarRespuesta(texto) {
  arregloTokens = []
  numero_token = 0
  lineas = 0;
  texto = texto.trim();
  texto = texto.split("\n")
  for (var k in texto) {
    lineas++
    analizarLinea(texto[k], lineas)
  }
  mostrarTokens(arregloTokens, lineas)
  $("#obtenerToken").prop('disabled', false);
  $("#semantico").prop('disabled', false);
}

function analizarLinea(texto, linea) {
  etapa = "lexico"
  texto = texto.replace(/\/\*.*/g, '')
  texto = texto.trim();
  if (texto != "") {
    var lexema = "";
    var limite = 0;
    var principio = 0;
    var exprCadena = /".*"/g;
    var cadena = texto.search(exprCadena) != -1
    if (cadena) {
      var respuesta = exprCadena.exec(texto.toString())
      principio = respuesta["index"]
      limite = principio + respuesta[0].length - 1
    }

    for (var i = 0; i < texto.length; i++) {
      if (cadena) {
        while (i >= principio && i <= limite) {
          lexema += texto.charAt(i)
          i++
          if (lexema.endsWith('"') && lexema.length > 1) {
            var objeto = Object.create(token)
            objeto.setToken(lexema, linea)
            arregloTokens.push(objeto)
            var elemento = Object.create(elementoTabla)
            elemento.setElemento(objeto.lexema, objeto.tipo, "", "", "")
            addElemento(elemento)
            lexema = ""
          }
        }
        switch (determinar(texto.charAt(i))) {
          case "token":
            if (lexema != "") {
              var objeto = Object.create(token)
              objeto.setToken(lexema, linea)
              arregloTokens.push(objeto)
              var elemento = Object.create(elementoTabla)
              elemento.setElemento(objeto.lexema, objeto.tipo, "", "", "")
              addElemento(elemento)
              lexema = ""
            }
            var objeto = Object.create(token)
            objeto.setToken(texto.charAt(i), linea)
            arregloTokens.push(objeto)
            var elemento = Object.create(elementoTabla)
            elemento.setElemento(objeto.lexema, objeto.tipo, "", "", "")
            addElemento(elemento)
            break;
          case "agregar":
            lexema += texto.charAt(i)
            break;
          case "ignorar":
            if (lexema != "") {
              var objeto = Object.create(token)
              objeto.setToken(lexema, linea)
              arregloTokens.push(objeto)
              var elemento = Object.create(elementoTabla)
              elemento.setElemento(objeto.lexema, objeto.tipo, "", "", "")
              addElemento(elemento)
              lexema = ""
            }
            break;
        }
      } else {
        switch (determinar(texto.charAt(i))) {
          case "token":
            if (lexema != "") {
              var objeto = Object.create(token)
              objeto.setToken(lexema, linea)
              arregloTokens.push(objeto)
              var elemento = Object.create(elementoTabla)
              elemento.setElemento(objeto.lexema, objeto.tipo, "", "", "")
              addElemento(elemento)
              lexema = ""
            }
            var objeto = Object.create(token)
            objeto.setToken(texto.charAt(i), linea)
            arregloTokens.push(objeto)
            var elemento = Object.create(elementoTabla)
            elemento.setElemento(objeto.lexema, objeto.tipo, "", "", "")
            addElemento(elemento)
            break;
          case "agregar":
            lexema += texto.charAt(i)
            if (i == texto.length - 1) {
              if (lexema != "") {
                var objeto = Object.create(token)
                objeto.setToken(lexema, linea)
                arregloTokens.push(objeto)
                var elemento = Object.create(elementoTabla)
                elemento.setElemento(objeto.lexema, objeto.tipo, "", "", "")
                addElemento(elemento)
                lexema = ""
              }
            }
            break;
          case "ignorar":
            if (lexema != "") {
              var objeto = Object.create(token)
              objeto.setToken(lexema, linea)
              arregloTokens.push(objeto)
              var elemento = Object.create(elementoTabla)
              elemento.setElemento(objeto.lexema, objeto.tipo, "", "", "")
              addElemento(elemento)
              lexema = ""
            }
            break;
        }
      }
    }
  }
  console.log(texto)
  console.log(tablaReal)
}

function obtenerToken(Tokens) {
  if (Tokens[numero_token] == undefined) {
    alert("Ha llegado al ultimo token")
    $("#obtenerToken").prop('disabled', true);
    respuesta += `Lineas: ` + lineas
    jar2.updateCode(respuesta)
    numero_token = 0;
  } else {
    if (Tokens[numero_token].tipo.includes("ERROR")) {
      respuesta += (numero_token + 1) + ` - (lexema: ` + Tokens[numero_token].lexema + ` , ` + Tokens[numero_token].tipo + ` en la linea ` + Tokens[numero_token].linea + `)\n`
    } else {
      respuesta += (numero_token + 1) + ` - (lexema: ` + Tokens[numero_token].lexema + ` , ` + Tokens[numero_token].tipo + `)\n`
    }
    jar2.updateCode(respuesta)
    numero_token++
  }
}

function determinar(char) {
  if (ignorar.includes(char)) {
    return "ignorar"
  }
  if (separar.includes(char)) {
    return "token"
  }
  if (char == '"') {
    return "cadena"
  }
  return "agregar"
}

/*function mostrarTablaSimbolos (){
 	var contador = 1
 	var html=`<thead>
 	<tr>
 	<th scope="col">#</th>
 	<th scope="col">Símbolo</th>
 	<th scope="col">Tipo</th
 	</tr>
 	</thead>
 	<tbody>`
 	for (var k in tablaSimbolos){
 		html+=`<tr>
 		<th scope="row">`+contador+`</th>
 		<td>`+k+`</td>
 		<td>`+tablaSimbolos[k]+`</td>
 		</tr>`		
 		contador++
 	}
 	html+=`</tbody>`
 	var elem = $(document.createElement('table'))
 	.attr('class',"table table-hover table-dark")
 	.html(html)
 	.appendTo('#tablaModalInsertada');
 }*/

function mostrarTablaSimbolos() {
  var contador = 1
  var html = `<thead>
 	<tr>
 	<th scope="col">#</th>
 	<th scope="col">Lexema</th>
 	<th scope="col">Tipo Lexema</th>
 	<th scope="col">Tipo</th>
 	<th scope="col">Valor</th>
 	<th scope="col">Accion</th
 	</tr>
 	</thead>
 	<tbody>`
  for (var k in tablaReal) {
    html += `<tr>
 		<th scope="row">` + contador + `</th>
 		<td>` + tablaReal[k].lexema + `</td>
 		<td>` + tablaReal[k].tipo_lexema + `</td>
 		<td>` + tablaReal[k].tipo + `</td>
 		<td>` + tablaReal[k].valor + `</td>
 		<td>` + tablaReal[k].accion + `</td>
 		</tr>`
    contador++
  }
  $('#tablaModalInsertada').empty();
  html += `</tbody>`
  var elem = $(document.createElement('table'))
    .attr('class', "table table-hover table-dark")
    .html(html)
    .appendTo('#tablaModalInsertada');
}


function mostrarTokens(Tokens, lineas) {
  var respuesta = ``;
  var i = 1;
  var error = 0;
  for (var k in Tokens) {
    if (Tokens[k].tipo.includes('ERROR')) {
      respuesta += i + ` - (lexema: ` + Tokens[k].lexema + ` , ` + Tokens[k].tipo + `)\n`
      error++;
    }
    i++
    if (error == 0) {
      respuesta = `El programa fue escaneado con exito \n`
      $("#parser").prop('disabled', false);
    }
  }
  respuesta += `Lineas: ` + lineas
  jar2.updateCode(respuesta)
}

function parser() {
  etapa = "sintactico"
  numero_token = 0;
  Regla_1();
  if (arregloTokens.length != numero_token) {
    respuesta += ` \n Exede los límites de la gramática\nNo se pudo parsear el programa \n`;
    jar2.updateCode(respuesta);
  } else if (error_parser == 0) {
    respuesta += ` \nEl programa fue parseado con exito \n`;
    jar2.updateCode(respuesta);
  } else {
    respuesta += ` \nNo se pudo parsear el programa \n`;
    jar2.updateCode(respuesta);
  }
}

function Regla_1() {
  for (var k in Regla1) {
    if (arregloTokens[numero_token] != undefined) {
      var lexema = arregloTokens[numero_token].lexema
      if (Regla1[k][1] == "ST") {
        if (Regla1[k][0] == lexema) {
          console.log(lexema)
        } else {
          error_parser++
          respuesta += "\nError en el lexema " + lexema + " no aplica a la regla 1 " + Regla1[k][0];
        }
        numero_token++;
      } else {
        switch (Regla1[k][0]) {
          case "2":
            Regla_2();
            break;
          case "6":
            Regla_6();
            break;
          default:
        }
      }
    } else {
      error_parser++
      respuesta += "\nError no hay suficientes tokens se esperaba " + Regla1[k][0];
    }
  }
}

function Regla_2() {
  var elemento = Object.create(elementoTabla);
  for (var k in Regla2) {
    if (arregloTokens[numero_token] != undefined) {
      var lexema = arregloTokens[numero_token].lexema
      if (lexema != "If") {
        if (Regla2[k][1] == "ST") {
          if (Regla2[k][0] == lexema) {
            console.log(lexema)
          } else if (Regla2[k][0] == arregloTokens[numero_token].tipo) {
            console.log(lexema)
            if (Regla2[k][0] == "ID") {
              elemento.setElemento(lexema, arregloTokens[numero_token].tipo, "", "", "")
            }
          } else {
            error_parser++
            respuesta += "\nError en el lexema " + lexema + " no aplica a la regla 2 " + Regla2[k][0];
          }
          numero_token++;
        } else {
          if (Regla2[k][0] == "P_T") {
            switch (lexema) {
              case "Integer":
                Regla_3();
                elemento.tipo = lexema;
                numero_token++;
                break;
              case "String":
                Regla_4();
                elemento.tipo = lexema;
                numero_token++;
                break;
              case "Decimal":
                Regla_5();
                elemento.tipo = lexema;
                numero_token++;
                break;
            }
          }
          addElemento(elemento);
        }

      }
    } else {
      error_parser++
      respuesta += "\nError no hay suficientes tokens se esperaba " + Regla2[k][0];
    }
  }
}

function Regla_3() {
  for (var k in Regla3) {
    if (arregloTokens[numero_token] != undefined) {
      var lexema = arregloTokens[numero_token].lexema
      if (Regla3[k][1] == "ST") {
        if (Regla3[k][0] == lexema) {
          console.log(lexema)
        } else {
          error_parser++
          respuesta += "\nError en el lexema " + lexema + " no aplica a la regla 3 " + Regla3[k][0];
        }
      }
    } else {
      error_parser++
      respuesta += "\nError no hay suficientes tokens se esperaba " + Regla3[k][0];
    }
  }
}

function Regla_4() {
  for (var k in Regla4) {
    if (arregloTokens[numero_token] != undefined) {
      var lexema = arregloTokens[numero_token].lexema
      if (Regla4[k][1] == "ST") {
        if (Regla4[k][0] == lexema) {
          console.log(lexema)
        } else {
          error_parser++
          respuesta += "\nError en el lexema " + lexema + " no aplica a la regla 4 " + Regla4[k][0];
        }
      }
    } else {
      error_parser++
      respuesta += "\nError no hay suficientes tokens se esperaba " + Regla4[k][0];
    }
  }
}

function Regla_5() {
  for (var k in Regla5) {
    if (arregloTokens[numero_token] != undefined) {
      var lexema = arregloTokens[numero_token].lexema
      if (Regla5[k][1] == "ST") {
        if (Regla5[k][0] == lexema) {
          console.log(lexema)
        } else {
          error_parser++
          respuesta += "\nError en el lexema " + lexema + " no aplica a la regla 5 " + Regla5[k][0];
        }
      }
    } else {
      error_parser++
      respuesta += "\nError no hay suficientes tokens se esperaba " + Regla5[k][0];
    }
  }
}

function Regla_6() {
  for (var k in Regla6) {
    if (arregloTokens[numero_token] != undefined) {
      var lexema = arregloTokens[numero_token].lexema
      if (Regla6[k][1] == "ST") {
        if (Regla6[k][0] == lexema) {
          console.log(lexema)
        } else {
          error_parser++
          respuesta += "\nError en el lexema " + lexema + " no aplica a la regla 6 " + Regla6[k][0];
        }
        numero_token++;
      } else {
        switch (Regla6[k][0]) {
          case "7":
            Regla_7();
            break;
          case "8":
            Regla_8();
            break;
          default:
        }
      }
    } else {
      error_parser++
      respuesta += "\nError, no hay suficientes tokens se esperaba " + Regla6[k][0];
    }
  }
}

function Regla_7() {
  for (var k in Regla7) {
    if (arregloTokens[numero_token] != undefined) {
      var lexema = arregloTokens[numero_token].lexema
      if (Regla7[k][1] == "ST") {
        if (Regla7[k][0] == arregloTokens[numero_token].tipo) {
          console.log(lexema)
        } else {
          error_parser++
          respuesta += "\nError en el lexema " + lexema + " no aplica a la regla 7 " + Regla7[k][0];
        }
        numero_token++;
      }
    } else {
      error_parser++
      respuesta += "\nError, no hay suficientes tokens se esperaba " + Regla7[k][0];
    }
  }
}

function Regla_8() {
  for (var k in Regla8) {
    if (arregloTokens[numero_token] != undefined) {
      var lexema = arregloTokens[numero_token].lexema
      if (lexema != "}") {
        if (Regla8[k][1] == "ST") {
          if (Regla8[k][0] == lexema) {
            console.log(lexema)
          } else if (Regla8[k][0] == arregloTokens[numero_token].tipo) {
            console.log(lexema)
          } else {
            error_parser++
            respuesta += "\nError en el lexema " + lexema + " no aplica a la regla 8 " + Regla8[k][0];
          }
          numero_token++;
        }
      }
    } else {
      error_parser++
      respuesta += "\nError, no hay suficientes tokens se esperaba " + Regla8[k][0];
    }
  }
}

function semantico(arregloTokens) {
  var ids = [];
  for (var k in tablaReal) {
    if (tablaReal[k].tipo_lexema == "ID")
      ids.push(tablaReal[k])
  }
  for (var k in ids) {
    for (var j in arregloTokens) {
      if (arregloTokens[j].lexema == ids[k].lexema && arregloTokens[j].tipo == ids[k].tipo_lexema) {
        if (arregloTokens[parseInt(j) + 1].lexema != "As") {
          var accion = determinarAccion(arregloTokens[parseInt(j) + 1].lexema);
          ids[k].accion = accion;
          if (accion != "operacion") {
            ids[k].valor = determinarValor(ids[k].tipo, arregloTokens[parseInt(j) + 2]);
          }
          addElemento(ids[k]);
        }
      }
    }
  }
  if (error_semantico == 0) {
    respuesta += ` \nEl programa fue no tiene errores semanticos\n`;
    jar2.updateCode(respuesta);
  } else {
    respuesta += ` \nEl programa contiene errores semanticos\n`;
    jar2.updateCode(respuesta);
  }
}

function determinarAccion(lexema) {
  var accion = "";
  if (lexema == ":=")
    accion = "asignacion"
  else
    accion = "operacion"
  return accion;
}

function determinarValor(tipo, valor) {
  if (tipo == "Integer" && valor.tipo == "NU" && Number.isInteger(Number(valor.lexema)))
    return valor.lexema
  else if (tipo == "Decimal" && valor.tipo == "NU" && Number.isInteger(Number(valor.lexema)) === false)
    return valor.lexema
  else if (tipo == "String" && valor.tipo == "ST")
    return valor.lexema
  else {
    error_semantico++;
    respuesta += "\nAsignacion invalida, tipos de dato incompatibles";
    return ""
  }
}
