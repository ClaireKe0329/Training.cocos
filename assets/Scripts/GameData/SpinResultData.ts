import { SymbolType } from './SymbolType';
import { ILineResultData } from './LineResultData';

// 保存單局 Spin 的完整結果
export class SpinResultData
{
    // 本局最終盤面，第一層 Index 為 Reel，第二層 Index 為 Row
    public readonly SlotGrids: SymbolType[][];

    // 本局所有中獎 Payline 的結果
    public readonly LineResults: ILineResultData[];

    // 本局所有 Line Score 加總後的總得分
    public readonly TotalScore: number;

    public constructor( slotGrids: SymbolType[][], lineResults: ILineResultData[], totalScore: number )
    {
        // 建立獨立的 Result Snapshot，避免來源陣列後續修改影響本局結果
        this.SlotGrids = slotGrids.map( ( reelSymbols: SymbolType[] ): SymbolType[] => [ ...reelSymbols ] );
        this.LineResults = lineResults.map( ( lineResult: ILineResultData ): ILineResultData => ( {
            PaylineIndex: lineResult.PaylineIndex,
            SymbolType: lineResult.SymbolType,
            MatchCount: lineResult.MatchCount,
            WinningPositions: lineResult.WinningPositions.map( ( position ) => ( {
                ReelIndex: position.ReelIndex,
                RowIndex: position.RowIndex,
            } ) ),
            Score: lineResult.Score,
        } ) );
        this.TotalScore = totalScore;
    }
}
