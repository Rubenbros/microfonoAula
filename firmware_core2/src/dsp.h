#ifndef DSP_H
#define DSP_H

/**
 * Filtro A-weighting para fs=16000 Hz
 *
 * Implementa la curva de ponderacion A (IEC 61672) como cascada de
 * 3 secciones biquad IIR (Direct Form II Transposed).
 *
 * Modela los polos de la funcion de transferencia analogica:
 *   - Biquad 1: 2nd-order HP a 20.6 Hz (polo doble, Q=0.5)
 *   - Biquad 2: 1st-order HP a 107.7 Hz
 *   - Biquad 3: 1st-order HP a 737.9 Hz
 *
 * El polo doble a 12194 Hz se omite (por encima de Nyquist a 16kHz).
 * Error tipico respecto a A-weighting estandar: < 2 dB en 100-8000 Hz.
 *
 * Ganancia normalizada a 0 dB en 1 kHz (factor 1.24358).
 */

// ============================================
// Biquad filter (Direct Form II Transposed)
// ============================================
typedef struct {
    float b0, b1, b2;   // Coeficientes numerador
    float a1, a2;        // Coeficientes denominador (a0 = 1.0)
    float s1, s2;        // Estado interno
} Biquad;

static inline float biquad_process(Biquad* f, float x) {
    float y = f->b0 * x + f->s1;
    f->s1 = f->b1 * x - f->a1 * y + f->s2;
    f->s2 = f->b2 * x - f->a2 * y;
    return y;
}

// ============================================
// Filtro A-weighting (3 biquads en cascada)
// ============================================
#define A_WEIGHT_SECTIONS 3

// Ganancia de normalizacion a 1 kHz (compensa -1.89 dB de las secciones)
#define A_WEIGHT_GAIN 1.24358f

typedef struct {
    Biquad sections[A_WEIGHT_SECTIONS];
} AWeightFilter;

static void aweight_init(AWeightFilter* aw) {
    // Biquad 1: 2nd-order HP, fc=20.6Hz, Q=0.5 (polo doble)
    aw->sections[0] = (Biquad){
        .b0 =  0.991965f,
        .b1 = -1.983931f,
        .b2 =  0.991965f,
        .a1 = -1.983906f,
        .a2 =  0.983946f,
        .s1 = 0.0f, .s2 = 0.0f
    };

    // Biquad 2: 1st-order HP, fc=107.7Hz
    aw->sections[1] = (Biquad){
        .b0 =  0.979286f,
        .b1 = -0.979286f,
        .b2 =  0.0f,
        .a1 = -0.958573f,
        .a2 =  0.0f,
        .s1 = 0.0f, .s2 = 0.0f
    };

    // Biquad 3: 1st-order HP, fc=737.9Hz
    aw->sections[2] = (Biquad){
        .b0 =  0.873487f,
        .b1 = -0.873487f,
        .b2 =  0.0f,
        .a1 = -0.746974f,
        .a2 =  0.0f,
        .s1 = 0.0f, .s2 = 0.0f
    };
}

/**
 * Procesa una muestra a traves del filtro A-weighting.
 * Devuelve la muestra ponderada (normalizada a 0 dB en 1 kHz).
 */
static float aweight_process(AWeightFilter* aw, float sample) {
    float out = sample;
    for (int i = 0; i < A_WEIGHT_SECTIONS; i++) {
        out = biquad_process(&aw->sections[i], out);
    }
    return out * A_WEIGHT_GAIN;
}

/**
 * Resetea el estado interno del filtro (usar tras un gap en las muestras).
 */
static void aweight_reset(AWeightFilter* aw) {
    for (int i = 0; i < A_WEIGHT_SECTIONS; i++) {
        aw->sections[i].s1 = 0.0f;
        aw->sections[i].s2 = 0.0f;
    }
}

#endif // DSP_H
