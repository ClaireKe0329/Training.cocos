import { SymbolType } from '../GameData/SymbolType';
import { ILineResultData } from '../GameData/LineResultData';
import { ISymbolMultiplier } from '../GameData/SymbolMultiplier';
import { GameConfig } from '../GameUtility/GameConfig';

// 依照設定的 Payline 判斷盤面中所有中獎線
export class SpinResultChecker
{
    // 每種 Symbol 的最低連線數由自身倍率設定中的最小 key 決定
    public CheckLineResults( slotGrids: SymbolType[][] ): ILineResultData[]
    {
        const paylines: number[][] = GameConfig.GetInstance().Paylines;
        const symbolMultipliers: ISymbolMultiplier[] = GameConfig.GetInstance().SymbolMultipliers;
        const lineResults: ILineResultData[] = [];

        for ( let paylineIndex: number = 0; paylineIndex < paylines.length; paylineIndex++ )
        {
            const lineResult: ILineResultData | null = this.checkPayline( slotGrids, paylines[ paylineIndex ], paylineIndex, symbolMultipliers );

            if ( lineResult !== null )
            {
                lineResults.push( lineResult );
            }
        }

        return lineResults;
    }

    // 從第一軸開始向右連續比對相同 Symbol，遇到不同 Symbol 時停止
    private checkPayline( slotGrids: SymbolType[][], payline: number[], paylineIndex: number, symbolMultipliers: ISymbolMultiplier[] ): ILineResultData | null
    {
        const firstSymbol: SymbolType = slotGrids[ 0 ][ payline[ 0 ] ];
        const symbolMultiplier: ISymbolMultiplier | undefined = symbolMultipliers.find( ( configuredMultiplier: ISymbolMultiplier ): boolean => configuredMultiplier.SymbolType === firstSymbol );

        if ( symbolMultiplier === undefined )
        {
            throw new Error( `[SpinResultChecker] 找不到 ${SymbolType[ firstSymbol ]} 的倍率設定。` );
        }

        let matchCount: number = 1;
        const winningPositions = [ { ReelIndex: 0, RowIndex: payline[ 0 ] } ];

        for ( let reelIndex: number = 1; reelIndex < payline.length; reelIndex++ )
        {
            const rowIndex: number = payline[ reelIndex ];
            const currentSymbol: SymbolType = slotGrids[ reelIndex ][ rowIndex ];

            if ( currentSymbol === firstSymbol )
            {
                matchCount++;
                winningPositions.push( { ReelIndex: reelIndex, RowIndex: rowIndex } );
            }
            else
            {
                break;
            }
        }

        const minimumMatchCount: number = Math.min( ...Object.keys( symbolMultiplier.Multipliers ).map( ( configuredMatchCount: string ): number => Number( configuredMatchCount ) ) );

        if ( matchCount < minimumMatchCount )
        {
            return null;
        }

        // Checker 只保存命中內容，Score 由 ScoreCalculator 接續回填
        const lineResult: ILineResultData = {
            PaylineIndex: paylineIndex,
            SymbolType: firstSymbol,
            MatchCount: matchCount,
            WinningPositions: winningPositions,
            Score: 0,
        };

        return lineResult;
    }
}
