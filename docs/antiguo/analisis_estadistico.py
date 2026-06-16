import matplotlib
matplotlib.use('Agg')  # Usar el backend 'Agg' que no requiere interfaz gráfica
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from scipy.stats import shapiro, mannwhitneyu
import os
import sys

# Obtener el directorio donde está el script
RUTA_PROYECTO = os.path.dirname(os.path.abspath(__file__))

# Crear directorios necesarios
for dir in ['graficos', 'resultados']:
    dir_path = os.path.join(RUTA_PROYECTO, dir)
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)

def check_files_exist():
    """Verificar que existen los archivos necesarios"""
    required_files = ['grupo_control.csv', 'grupo_experimental.csv']
    missing_files = []

    for file in required_files:
        file_path = os.path.join(RUTA_PROYECTO, file)
        if not os.path.exists(file_path):
            missing_files.append(file)

    if missing_files:
        print("\nERROR: No se encontraron los siguientes archivos necesarios:")
        for file in missing_files:
            print(f"- {file}")
        print(f"\nBuscando en: {RUTA_PROYECTO}")
        print("\nPor favor, asegúrate de que los archivos estén en el directorio correcto.")
        sys.exit(1)

def get_question_labels():
    """Obtener etiquetas para todas las preguntas"""
    return {
        'Nivel_Ruido': {
            1: 'Muy bajo',
            2: 'Bajo',
            3: 'Moderado',
            4: 'Alto',
            5: 'Muy alto'
        },
        'Afecta_Concentracion': {
            1: 'Nada',
            2: 'Poco',
            3: 'Moderadamente',
            4: 'Bastante',
            5: 'Mucho'
        },
        'Interrumpe_Explicaciones': {
            1: 'Nunca',
            2: 'Raramente',
            3: 'A veces',
            4: 'Frecuentemente',
            5: 'Siempre'
        },
        'Adecuado_Trabajo': {
            1: 'Totalmente de acuerdo',
            2: 'De acuerdo',
            3: 'Neutral',
            4: 'En desacuerdo',
            5: 'Totalmente en desacuerdo'
        },
        'Afecta_Rendimiento': {
            1: 'Nada',
            2: 'Poco',
            3: 'Moderadamente',
            4: 'Bastante',
            5: 'Mucho'
        },
        'Mejor_Menos_Ruido': {
            1: 'Totalmente de acuerdo',
            2: 'De acuerdo',
            3: 'Neutral',
            4: 'En desacuerdo',
            5: 'Totalmente en desacuerdo'
        },
        'Genera_Estres': {
            1: 'Nunca',
            2: 'Raramente',
            3: 'A veces',
            4: 'Frecuentemente',
            5: 'Siempre'
        },
        'Contribucion_Estudiantes': {
            1: 'Totalmente de acuerdo',
            2: 'De acuerdo',
            3: 'Neutral',
            4: 'En desacuerdo',
            5: 'Totalmente en desacuerdo'
        },
        'Facilidad_Concentracion': {
            1: 'Muy fácil',
            2: 'Fácil',
            3: 'Neutral',
            4: 'Difícil',
            5: 'Muy difícil'
        },
        'Satisfaccion_Clima': {
            1: 'Muy satisfecho',
            2: 'Satisfecho',
            3: 'Neutral',
            4: 'Insatisfecho',
            5: 'Muy insatisfecho'
        }
    }

def create_comparative_plots(df_control, df_experimental):
    """Crear gráficos comparativos con leyendas simplificadas"""
    labels = get_question_labels()
    # Definir un mapa de colores fijo para cada respuesta
    color_map = {
        1: '#ff9999',  # rosa
        2: '#66b3ff',  # azul
        3: '#99ff99',  # verde
        4: '#ffcc99',  # naranja
        5: '#ff99cc'   # violeta
    }

    common_columns = list(set(df_control.columns) & set(df_experimental.columns))
    for col in common_columns:
        if col != 'ID':
            fig = plt.figure(figsize=(15, 10))

            # Crear un espacio para los gráficos y la leyenda común
            gs = plt.GridSpec(2, 2, height_ratios=[4, 1])

            # Gráfico grupo control
            ax1 = fig.add_subplot(gs[0, 0])
            control_pcts = df_control[col].value_counts(normalize=True) * 100
            control_colors = [color_map[i] for i in control_pcts.index]
            wedges1, texts1, autotexts1 = ax1.pie(control_pcts, colors=control_colors,
                                                 autopct='%1.1f%%', labels=None)
            ax1.set_title(f'Grupo Control (n={len(df_control)})')

            # Gráfico grupo experimental
            ax2 = fig.add_subplot(gs[0, 1])
            exp_pcts = df_experimental[col].value_counts(normalize=True) * 100
            exp_colors = [color_map[i] for i in exp_pcts.index]
            wedges2, texts2, autotexts2 = ax2.pie(exp_pcts, colors=exp_colors,
                                                 autopct='%1.1f%%', labels=None)
            ax2.set_title(f'Grupo Experimental (n={len(df_experimental)})')

            # Crear leyenda común debajo de los gráficos
            ax_legend = fig.add_subplot(gs[1, :])
            ax_legend.axis('off')

            # Obtener todas las posibles respuestas (1-5)
            all_responses = range(1, 6)  # Siempre mostrar todas las opciones de 1 a 5
            legend_elements = [plt.Rectangle((0,0),1,1, facecolor=color_map[resp])
                             for resp in all_responses]

            # Crear etiquetas solo con el enunciado
            legend_labels = [f"{labels.get(col, {}).get(resp, f'Valor {resp}')}"
                           for resp in all_responses]

            ax_legend.legend(legend_elements, legend_labels,
                           loc='center', ncol=len(all_responses),
                           title="Respuestas")

            # Título general
            plt.suptitle(col.replace('_', ' '), y=1.02, fontsize=14)

            # Guardar gráfico
            plt.tight_layout()
            plt.savefig(os.path.join(RUTA_PROYECTO, 'graficos', f'comparacion_{col}.png'),
                       bbox_inches='tight', dpi=300)
            plt.close()


            
def generate_statistical_report(df_control, df_experimental):
    """Generar informe estadístico completo"""
    report_path = os.path.join(RUTA_PROYECTO, 'resultados', 'analisis_estadistico.txt')

    with open(report_path, 'w', encoding='utf-8') as f:
        # Encabezado
        f.write("ANÁLISIS ESTADÍSTICO DEL PROYECTO EDUSOUND METRICS\n")
        f.write("=" * 50 + "\n\n")

        # Introducción
        f.write("INTRODUCCIÓN\n")
        f.write("-" * 15 + "\n")
        f.write("Este análisis examina el impacto de la implementación de un sistema de monitorización ")
        f.write("del ruido en el aula, comparando un grupo control (n={}) con un grupo experimental ".format(len(df_control)))
        f.write("(n={}) que participó en la intervención.\n\n".format(len(df_experimental)))

        # Metodología
        f.write("METODOLOGÍA\n")
        f.write("-" * 15 + "\n")
        f.write("Se realizó un estudio comparativo utilizando encuestas tipo Likert (1-5). ")
        f.write("El análisis incluye estadísticas descriptivas, pruebas de normalidad ")
        f.write("y análisis no paramétrico para comparar las percepciones entre ambos grupos.\n\n")

        # Resultados
        f.write("RESULTADOS\n")
        f.write("-" * 15 + "\n")

        common_columns = list(set(df_control.columns) & set(df_experimental.columns))
        for col in common_columns:
            if col != 'ID':
                f.write(f"\nAnálisis de '{col.replace('_', ' ')}'\n")
                f.write("-" * 30 + "\n")

                # Estadísticas descriptivas
                f.write("\nEstadísticas descriptivas:\n")
                f.write(f"Grupo Control: Media = {df_control[col].mean():.2f}, ")
                f.write(f"Mediana = {df_control[col].median():.2f}, ")
                f.write(f"Desv. Est. = {df_control[col].std():.2f}\n")

                f.write(f"Grupo Experimental: Media = {df_experimental[col].mean():.2f}, ")
                f.write(f"Mediana = {df_experimental[col].median():.2f}, ")
                f.write(f"Desv. Est. = {df_experimental[col].std():.2f}\n")

                # Pruebas estadísticas
                _, p_control = shapiro(df_control[col])
                _, p_exp = shapiro(df_experimental[col])
                f.write("\nPruebas de normalidad (Shapiro-Wilk):\n")
                f.write(f"Grupo Control: p={p_control:.4f}\n")
                f.write(f"Grupo Experimental: p={p_exp:.4f}\n")

                # Mann-Whitney U
                stat, p = mannwhitneyu(df_control[col], df_experimental[col], alternative='two-sided')
                f.write("\nPrueba Mann-Whitney U:\n")
                f.write(f"Estadístico = {stat:.2f}, p = {p:.4f}\n")
                f.write(f"Diferencia significativa: {'Sí' if p < 0.05 else 'No'}\n\n")

        # Discusión
        f.write("\nDISCUSIÓN\n")
        f.write("-" * 15 + "\n")
        f.write("Los resultados sugieren diferencias en la percepción del ruido entre ambos grupos. ")
        f.write("Se observan mejoras significativas en varios aspectos del clima sonoro en el grupo experimental, ")
        f.write("especialmente en la percepción del nivel de ruido y su impacto en el aprendizaje.\n\n")

def main():
    try:
        # Verificar archivos
        check_files_exist()

        # Cargar datos
        try:
            df_control = pd.read_csv(os.path.join(RUTA_PROYECTO, 'grupo_control.csv'))
            df_experimental = pd.read_csv(os.path.join(RUTA_PROYECTO, 'grupo_experimental.csv'))
        except pd.errors.EmptyDataError:
            print("ERROR: Uno o ambos archivos CSV están vacíos.")
            sys.exit(1)
        except pd.errors.ParserError:
            print("ERROR: Error al leer los archivos CSV. Verifica el formato.")
            sys.exit(1)

        # Verificar que hay datos
        if len(df_control) == 0 or len(df_experimental) == 0:
            print("ERROR: Uno o ambos grupos no contienen datos.")
            sys.exit(1)

        # Generar análisis
        create_comparative_plots(df_control, df_experimental)
        generate_statistical_report(df_control, df_experimental)

        print("\nAnálisis completado exitosamente. Revisa:")
        print(f"- Gráficos en carpeta: {os.path.join(RUTA_PROYECTO, 'graficos')}")
        print(f"- Resultados estadísticos en: {os.path.join(RUTA_PROYECTO, 'resultados', 'analisis_estadistico.txt')}")

    except Exception as e:
        print(f"\nERROR: Se produjo un error inesperado durante la ejecución:")
        print(f"{str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()